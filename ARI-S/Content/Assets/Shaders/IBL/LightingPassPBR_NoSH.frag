#version 450 core

layout (location = 0) out vec4 fragColor;
layout (location = 1) out float entityID;

layout (binding = 0) uniform sampler2D gPos;
layout (binding = 1) uniform sampler2D gNorm;
layout (binding = 2) uniform sampler2D gAlbedo;
layout (binding = 3) uniform sampler2D gMetRough;
layout (binding = 4) uniform sampler2D gEntityID;
layout (binding = 5) uniform sampler2D gDepth;

uniform sampler2D uShadowMap;
uniform mat4 worldToLightMat;

uniform samplerCube irradianceMap;
uniform samplerCube filteredMap;
uniform sampler2D brdfTable;

uniform vec3 lightDir;
uniform vec3 viewPos;

uniform int vWidth;
uniform int vHeight;

// ----------------------------------------------
// SHADOWS---------------------------------------
vec2 Quadratic(float a, float b, float c)
{
	float discriminant = b * b - 4 * a * c;
	float x1 = (-b + sqrt(discriminant)) / (2 * a);
	float x2 = (-b - sqrt(discriminant)) / (2 * a);
  
	if (x1 > x2)
	{
		return vec2(x2, x1);
	}
  
	return vec2(x1, x2);
}

vec3 Cholesky(float m11, float m12, float m13, float m22, float m23, float m33, 
			  float z1, float z2, float z3)
{
	float a = sqrt(m11);
	if (a <= 0.0f)
	{
		a = 1.0f * pow(10.0f, -4);
	}
	
	float b = m12 / a;
	float c = m13 / a;
	
	float d = sqrt(m22 - pow(b, 2));
	if (d <= 0.0f)
	{
		d = 1.0f * pow(10.0f, -4);
	}
	
	float e = (m23 - b * c) / d;
	
	float f = sqrt(m33 - pow(c, 2) - pow(e, 2));
	
	if (f <= 0.0f)
	{
		f = 1.0f * pow(10.0f, -4);
	}
	
	float c_1 = z1 / a;
	float c_2 = (z2 - b * c_1) / d;
	float c_3 = (z3 - c * c_1 - e * c_2) / f;
	
	float c3 = c_3 / f;
	float c2 = (c_2 - e * c3) / d;
	float c1 = (c_1 - b * c2 - c * c3) / a;
	
	return vec3(c1, c2, c3);
}

float Shadow(vec4 v, float bias)
{
	vec4 lightDepth = texture(uShadowMap, v.xy);

	vec4 b_ = (1.0f - bias) * lightDepth + bias * vec4(0.5f);
	float pixelDepth = v.z;
	
	vec3 choleskyVec = Cholesky(1.0f, b_.x, b_.y, b_.y, b_.z, b_.w, 
								1.0f, pixelDepth, pixelDepth * pixelDepth);
	
	vec2 roots = Quadratic(choleskyVec.z, choleskyVec.y, choleskyVec.x);

	if (pixelDepth <= roots.x)
	{
		return 0.0f;
	}
	
	else if (pixelDepth <= roots.y)
	{
		float num = (pixelDepth * roots.y - b_[0] * (pixelDepth + roots.y) + b_[1]);
		float denom = (roots.y - roots.x) * (pixelDepth - roots.x);
		
		return (num / denom);
	}
	
	else
	{
		float num = (roots.x * roots.y - b_[0] * (roots.x + roots.y) + b_[1]);
		float denom = (pixelDepth - roots.x) * (pixelDepth - roots.y);
		
		return 1 - (num / denom);
	}
}
// ----------------------------------------------
// ----------------------------------------------

// ----------------------------------------------
// PBS/IBL --------------------------------------
const float PI = 3.14159265359f;

uniform float envMapSize;
uniform float diffComponent;
uniform float exposure;

uniform bool sphereToCube;
uniform bool useSpecular;
uniform bool useDiffuse;
uniform bool useToneMapping;

uniform bool useSH;
uniform bool useOldPBRMethod;

uniform samplerCube envMap;

layout(std140, binding = 4) uniform Discrepancy
{
  vec4 hammersley[100];
  int N;
} hammersleyVals;

layout(std140, binding = 5) uniform SphereHarmonics
{
  vec4 shColor[9];
};

// -------

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 FresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec3 FresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// -----------------------------------------------------------------------------------------

float Distribution(vec3 N, vec3 H, float roughness)
{
    float a = pow(roughness, 2);
    float NdotH = max(dot(N, H), 0.0);
    float denom = PI * pow((pow(NdotH, 2.0f) * (a * a - 1.0f) + 1.0f), 2.0f);

    return (a * a) / denom;
}

vec3 Fresnel(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0f - roughness), F0) - F0) * pow(clamp(1.0f - cosTheta, 0.0f, 1.0), 5.0);
}

vec3 CalculateIrradiance(vec3 N)
{
	float A0 = PI;
	float A1 = 0.667f * PI;
	float A2 = 0.25f * PI;
	
	return shColor[0].xyz * 0.5f * sqrt(1.0f / PI) * A0
         + shColor[1].xyz * 0.5f * sqrt(3.0f / PI) * N.y * A1
         + shColor[2].xyz * 0.5f * sqrt(3.0f / PI) * N.z * A1
         + shColor[3].xyz * 0.5f * sqrt(3.0f / PI) * N.x * A1
         + shColor[4].xyz * 0.5f * sqrt(15.0f / PI) * N.x * N.y * A2
         + shColor[5].xyz * 0.5f * sqrt(15.0f / PI) * N.y * N.z * A2
         + shColor[6].xyz * 0.25f * sqrt(5.0f / PI) * (3.0f * N.z * N.z - 1.0f) * A2
         + shColor[7].xyz * 0.5f * sqrt(15.0f / PI) * N.x * N.z * A2
         + shColor[8].xyz * 0.25f * sqrt(15.0f / PI) * (N.x * N.x - N.y * N.y) * A2;
}

float GeometryAttenuation(vec3 L, vec3 V, vec3 N, vec3 H)
{
	return min(min((2.0f * dot(H, N) * dot(V, N)) / dot(V, H), (2.0f * dot(H, N) * dot(L, N)) / dot(V, H)), 1.0f);
}

vec3 TexCoordToDirection(vec2 uv, vec3 N, float roughness)
{
	float a = pow(roughness, 2);
	
	vec3 dir = vec3(cos(2 * PI * (0.5f - uv.x)) * sin(PI * uv.y), sin(2 * PI * (0.5f - uv.x)) * sin(PI * uv.y), cos(PI * uv.y));
	
  //float phi = 2.0f * PI * uv.x;
  //float thetaCos = sqrt((1.0f - uv.y) / (1.0f * (a * a - 1.0f) * uv.y));
  //float thetaSin = 1.0f - pow(thetaCos, 2);
  //vec3 dir = vec3(cos(phi) * thetaSin, sin(phi) * thetaSin, thetaCos);
  
	if(sphereToCube)
	{
		vec3 up = abs(N.z) < 0.999f ? vec3(vec2(0.0f), 1.0f) : vec3(1.0f, vec2(0.0f));
		vec3 t = normalize(cross(up, N));
		vec3 bt = cross(N, t);
		
		return normalize(t * dir.x + bt * dir.y + N * dir.z);
	}
	return normalize(dir);
}

vec3 MonteCarloApprox(vec3 N, vec3 V, vec3 R, vec3 A, vec3 B, float roughness, vec3 f0)
{	
	vec3 directions[20]; // HARD-CODED N-VALUE
	
	for (int i = 0; i < hammersleyVals.N; ++i)
	{
		float u = hammersleyVals.hammersley[2 * i].x;
		float v = hammersleyVals.hammersley[2 * (i + 1)].x;
		
		vec2 tex = vec2(u, atan((roughness * sqrt(v)) / sqrt(1.0f - v)) / PI);
		vec3 dir = TexCoordToDirection(tex, N, roughness);
		
		directions[i] = normalize(dir.x * A + dir.y * B + dir.z + R);
	}
	
	vec3 sum = vec3(0.0f);
	for (int i = 0; i < hammersleyVals.N; ++i)
	{
		vec3 wk = directions[i];
		vec3 H = normalize(wk + V);
		float nDotL = max(dot(wk, N), 0.0f);
		
		float D = Distribution(N, H, roughness);
		vec3 F = Fresnel(max(dot(H, V), 0.0f), f0, roughness);
		float G = GeometryAttenuation(wk, V, N, H);
		
		float lod = 0.5f * log2((envMapSize * envMapSize) / hammersleyVals.N) - 0.5f * log2(D);
		vec3 light = textureLod(envMap, wk, lod).rgb * nDotL;
		
		sum += (F * G) / (4.0f * dot(wk, N) * dot(V, N)) * light;
	}
	
	sum /= hammersleyVals.N;
	
	return sum;
}

// ----------------------------------------------
// ----------------------------------------------

vec3 LightCalc()
{
	vec2 fragUV = vec2(gl_FragCoord.x / vWidth, gl_FragCoord.y / vHeight);

	vec3 fragPos = texture(gPos, fragUV).rgb;
	vec3 norm = texture(gNorm, fragUV).rgb;
	
	vec3 albedo = pow(texture(gAlbedo, fragUV).rgb, vec3(2.2f));
	float metal = texture(gMetRough, fragUV).r;
	float rough = texture(gMetRough, fragUV).g;
	
	vec3 V = normalize(viewPos - fragPos);
	vec3 N = norm;
	vec3 R = reflect(-V, N);
	
	vec3 F0 = vec3(0.04f);
	F0 = mix(F0, albedo, metal);
	
	//// no radiance from light sources?
	//vec3 L = normalize(-lightDir);
	//vec3 H = normalize(V + L);
	//
	//// Cook-Torrance BRDF
	//float NDF = DistributionGGX(N, H, rough);
	//float G = GeometrySmith(N, V, L, rough);
	//vec3 F = FresnelSchlick(max(dot(H, V), 0.0f), F0);
	//
	//vec3 num = NDF * G * F;
	//float denom = 4.0f * max(dot(N, V), 0.0f) * max(dot(N, L), 0.0f) + 0.0001f;
	//vec3 spec = num / denom;
	//
	//vec3 kS = F;
	//vec3 kD = vec3(1.0f) - kS;
	//kD *= 1.0f - metal;
	//
	//float nDotL = max(dot(N, L), 0.0f);
	//
	//vec3 Lo = (kD * albedo / PI + spec) * nDotL;
	
	vec3 F = FresnelSchlickRoughness(max(dot(N, V), 0.0f), F0, rough);
	
	vec3 kS = F;
	vec3 kD = 1.0f - kS;
	kD *= 1.0f - metal;
	
	// diffuse
	vec3 irr = texture(irradianceMap, N).rgb;
	
	vec3 finalDiff = vec3(0.0f);
	
	if (useSH)
		finalDiff = (albedo / PI) * CalculateIrradiance(N);
	else
		finalDiff = irr * albedo;
	
	// specular
	vec3 finalSpec = vec3(0.0f);
	
	if (!useOldPBRMethod)
	{
		vec3 filteredColor = textureLod(filteredMap, R, rough * 4.0f).rgb;
		vec2 brdf = texture(brdfTable, vec2(max(dot(N, V), 0.0f), rough)).rg;
		finalSpec = filteredColor * (F * brdf.x + brdf.y);
	}
	else
	{
		//vec3 R = 2.0f * dot(norm, V) * norm - V;
		R = reflect(-V, normalize(norm));
		vec3 A = normalize(vec3(-R.z, R.x, 0.0f));
		vec3 B = normalize(cross(R, A));
	
		finalSpec = MonteCarloApprox(norm, V, R, A, B, rough, F0);
	}
	
	vec4 shadowCoord = worldToLightMat * vec4(fragPos, 1.0f);
	vec4 blur = texture(uShadowMap, shadowCoord.xy);
  
	float shadow = Shadow(shadowCoord, 1.0f * pow(10, -3));
	
	float currDepth = shadowCoord.z;
	float maximum = float(currDepth - 1.0f * pow(10, -3) <= blur.x);
	
	if (!useDiffuse)
		return finalSpec;

	else if (!useSpecular)
		return (max(1.0f  - shadow, maximum) * finalDiff);
		
	else if (!useSpecular && !useDiffuse)
		return vec3(0.0f);

	return (max(1.0f  - shadow, maximum) * finalDiff * kD) + finalSpec;
}

void main()
{
	vec2 uv = vec2(gl_FragCoord.x / vWidth, 
					gl_FragCoord.y / vHeight);
					
	vec3 color = LightCalc();
	
	if (useToneMapping)
	{
		color = (exposure * color) / ((exposure * color) + vec3(1.0f));
		color = pow(color, vec3(1.0f / 2.2f));
	}
	
	fragColor = vec4(color, 1.0f);
	entityID = texture(gEntityID, uv).r;
}
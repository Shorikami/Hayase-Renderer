#version 450 core
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec2 aTexCoords;

out vec2 texCoords;

void main()
{
	texCoords = aTexCoords;
	gl_Position = vec4(aPosition, 1.0f);
}
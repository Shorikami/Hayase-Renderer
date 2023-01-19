#ifndef UNIFORMMEMORY_HPP
#define UNIFORMMEMORY_HPP

#include <glad/glad.h>
#include <glm/glm.hpp>

namespace Hayase
{
	template <typename T>
	class UniformBuffer
	{
	public:
		UniformBuffer(unsigned idx)
		{
			glGenBuffers(1, &id);

			glBindBuffer(GL_UNIFORM_BUFFER, id);
			glBufferData(GL_UNIFORM_BUFFER, sizeof(T), nullptr, GL_STATIC_DRAW);
			glBindBuffer(GL_UNIFORM_BUFFER, 0);

			glBindBufferBase(GL_UNIFORM_BUFFER, idx, id);
		}

		void SetData()
		{
			glNamedBufferSubData(id, 0, sizeof(T), &data);
		}

		void UpdateData(GLintptr offset)
		{
			glNamedBufferSubData(id, offset, sizeof(T) - offset, static_cast<char*>(&data) + offset);
		}

		T& GetData()
		{
			return data;
		}

	private:
		GLuint id;
		T data;
	};

	class World
	{
	public:
		glm::mat4 proj = glm::mat4(1.0f);
		glm::mat4 view = glm::mat4(1.0f);
		glm::vec2 nearFar = glm::vec2(0.0f);
	};

	class Lights
	{
	public:
		glm::vec4 lightPos[16] = {};
		glm::vec4 lightColor[16] = {};
		glm::vec4 lightDir[16] = {};

		glm::vec4 eyePos = {};
		glm::vec4 emissive = {};
		glm::vec4 globalAmbient = {};
		glm::vec4 coefficients = {}; // x = kA, y = kD, z = kS, w = ns

		glm::vec4 fogColor = glm::vec4(1.0f);

		glm::vec4 specular[16] = {};
		glm::vec4 ambient[16] = {};
		glm::vec4 diffuse[16] = {};

		glm::vec4 lightInfo[16] = {}; // x = inner, y = outer, z = falloff, w = type

		glm::ivec4 modes = {}; // x = use gpu, y = use normals, z = UV calculation type

		glm::vec3 attenuation = glm::vec3(0.5f, 0.37f, 0.2f); // x = c1, y = c2, z = c3
		int numLights;
		//float _pad; // std140 requires padding - vec4 = 16 bytes, vec3 + float == 12 + 4 = 16 bytes
	};
}

#endif
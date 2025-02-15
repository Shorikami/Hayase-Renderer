#ifndef MESH_H
#define MESH_H

#include "VertexMemory.hpp"
#include "Shader.h"
#include "Texture.h"

#include <glm.hpp>
#include <vector>
#include <string>

#define BONE_INFLUENCE 4

namespace ARIS
{
	class Texture;

	struct Vertex
	{
		glm::vec3 s_Position;
		glm::vec3 s_Normal;
		glm::vec3 s_UV;
		glm::vec3 s_Tangent;
		glm::vec3 s_Bitangent;

		int m_BoneIDs[BONE_INFLUENCE];
		float m_BoneWeights[BONE_INFLUENCE];
	};

	class Mesh
	{
	public:
		Mesh();
		~Mesh();

		Mesh(std::vector<Vertex> v, std::vector<unsigned int> i, 
			std::vector<Texture> t, glm::vec3 maxBB, glm::vec3 minBB, std::string name = "Unnamed");

		Mesh(const Mesh& other);
		void operator=(const Mesh& other);

		void Update(glm::mat4 modelMat);
		void Draw(Shader& s, int entID = -1);
		void DrawBoundingBox();

		void BuildArrays();
		void DestroyArrays();

		VertexArray GetVAO() const& { return m_VertexArray; }

		size_t GetIndexCount() { return m_Indices.size(); }
		std::vector<unsigned int> GetIndices() const { return m_Indices; }

		size_t GetVertexCount() { return m_VertexData.size(); }
		std::vector<Vertex> GetVertexData() const { return m_VertexData; }

		std::vector<Texture> GetTextures() { return m_Textures; }

		glm::vec3 GetBoundingBoxCenter() { return (m_MaxBB - m_MinBB) / 2.0f; }
		glm::vec3 GetBoundingBoxMax() { return m_MaxBB; }
		glm::vec3 GetBoundingBoxMin() { return m_MinBB; }

	private:
		std::string m_MeshName;

		std::vector<Vertex> m_VertexData;
		std::vector<unsigned int> m_Indices;
		std::vector<Texture> m_Textures;

		glm::vec3 m_MinBB;
		glm::vec3 m_MaxBB;

		glm::vec3 m_InitialMax, m_InitialMin;

		VertexArray m_VertexArray;

		friend class SceneSerializer;
		friend class Model;
		friend class ModelBuilder;
		friend class HierarchyPanel;
	};
}

#endif
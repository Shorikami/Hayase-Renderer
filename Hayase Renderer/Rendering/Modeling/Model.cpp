#include <hyspch.h>
#include "Model.h"
#include "ModelBuilder.h"

#include "Texture.h"

namespace Hayase
{
    Model::Model(const Model& other)
      : m_Name(other.m_Name)
      , m_VertexData(other.m_VertexData)
      , m_Vertices(other.m_Vertices)
      , m_Normals(other.m_Normals)
      , m_UVs(other.m_UVs)
      , m_Indices(other.m_Indices)
    {
    }

	Model::Model(std::string path)
        : m_Name(std::string())
	{
		std::string fileType = std::string();

		size_t loc = path.find_last_of(".");
		if (loc != std::string::npos)
		{
			fileType = path.substr(loc + 1);
		}
		else
		{
			// warning
		}

		// probably a better way of doing this
		if (fileType.compare("obj") == 0)
		{
			ModelBuilder::Get().LoadOBJ(path, *this);
		}
		else if (fileType.compare("gltf") == 0)
		{
			ModelBuilder::Get().LoadGLTF(path, *this);
		}
	}

	void Model::BuildArrays()
	{
        const char* idx = "Index";
        const char* vert = "Vertex";
        const char* norm = "Normal";
        const char* uv = "TexCoords";

        m_VertexArray.Generate();
        m_VertexArray.Bind();

        m_VertexArray[idx] = VertexBuffer(GL_ELEMENT_ARRAY_BUFFER);
        m_VertexArray[idx].Generate();
        m_VertexArray[idx].Bind();
        m_VertexArray[idx].SetData<GLuint>(m_Indices.size(), m_Indices.data(), GL_STATIC_DRAW);

        m_VertexArray[vert] = VertexBuffer(GL_ARRAY_BUFFER);
        m_VertexArray[vert].Generate();
        m_VertexArray[vert].Bind();
        m_VertexArray[vert].SetData<glm::vec3>(m_Vertices.size(), m_Vertices.data(), GL_STATIC_DRAW);
        m_VertexArray[vert].SetAttPointer<GLfloat>(0, 3, GL_FLOAT, 3, 0);

        m_VertexArray[vert].Unbind();

        if (m_Normals.size() > 0)
        {
            m_VertexArray[norm] = VertexBuffer(GL_ARRAY_BUFFER);
            m_VertexArray[norm].Generate();
            m_VertexArray[norm].Bind();
            m_VertexArray[norm].SetData<glm::vec3>(m_Normals.size(), m_Normals.data(), GL_STATIC_DRAW);
            m_VertexArray[norm].SetAttPointer<GLfloat>(1, 3, GL_FLOAT, 3, 0);
            m_VertexArray[norm].Unbind();
        }

        
        m_VertexArray[uv] = VertexBuffer(GL_ARRAY_BUFFER);
        m_VertexArray[uv].Generate();
        m_VertexArray[uv].Bind();
        m_VertexArray[uv].SetData<glm::vec2>(m_UVs.size(), m_UVs.data(), GL_STATIC_DRAW);
        m_VertexArray[uv].SetAttPointer<GLfloat>(2, 2, GL_FLOAT, 2, 0);

        m_VertexArray[uv].Unbind();

        m_VertexArray.Clear();

        //if (m_Normals.size() > 0)
        //{
        //    nArray.Generate();
        //    nArray.Bind();
        //
        //    nArray[idx] = VertexBuffer(GL_ELEMENT_ARRAY_BUFFER);
        //    nArray[idx].Generate();
        //    nArray[idx].Bind();
        //    nArray[idx].SetData<GLuint>(getDisplayIndexBufferSize(DisplayType::VERTEX),
        //        getDisplayIndexBuffer(DisplayType::VERTEX), GL_STATIC_DRAW);
        //
        //    nArray[vert] = VertexBuffer(GL_ARRAY_BUFFER);
        //    nArray[vert].Generate();
        //    nArray[vert].Bind();
        //    nArray[vert].SetData<glm::vec3>(getDisplayCount(DisplayType::VERTEX),
        //        getDisplayNormalsVec3(DisplayType::VERTEX), GL_STATIC_DRAW);
        //    nArray[vert].SetAttPointer<GLfloat>(0, 3, GL_FLOAT, 3, 0);
        //
        //    nArray[vert].Unbind();
        //
        //    nArray.Clear();
        //}

        //fArray.Generate();
        //fArray.Bind();
        //
        //fArray[idx] = VertexBuffer(GL_ELEMENT_ARRAY_BUFFER);
        //fArray[idx].Generate();
        //fArray[idx].Bind();
        //fArray[idx].SetData<GLuint>(getDisplayIndexBufferSize(DisplayType::FACE),
        //    getDisplayIndexBuffer(DisplayType::FACE), GL_STATIC_DRAW);
        //
        //fArray[vert] = VertexBuffer(GL_ARRAY_BUFFER);
        //fArray[vert].Generate();
        //fArray[vert].Bind();
        //fArray[vert].SetData<glm::vec3>(getDisplayCount(DisplayType::FACE),
        //    getDisplayNormalsVec3(DisplayType::FACE), GL_STATIC_DRAW);
        //fArray[vert].SetAttPointer<GLfloat>(0, 3, GL_FLOAT, 3, 0);
        //
        //fArray[vert].Unbind();

        //nArray.Clear();
        //
        //nArray.Clear();
	}

    void Model::DestroyArrays()
    {
        m_VertexArray.Cleanup();
    }
}
#ifndef MODELBUILDER_H
#define MODELBUILDER_H

#include "Model.h"

namespace Hayase
{
	class ModelBuilder
	{
	public:
		ModelBuilder();
		~ModelBuilder();

		void BuildTable();
		void DestroyTable();

		void LoadOBJ(std::string path, Model& model);
		void LoadGLTF(std::string path, Model& model);

		inline static ModelBuilder& Get() { return *m_Instance; }
		
		std::unordered_map<std::string, Model*> GetModelTable() { return m_ModelTable; }

	private:
		std::unordered_map<std::string, Model*> m_ModelTable;
		static ModelBuilder* m_Instance;
	};
}

#endif
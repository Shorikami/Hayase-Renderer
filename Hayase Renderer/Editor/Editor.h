#ifndef EDITOR_H
#define EDITOR_H

#include "Layer.h"
#include "Memory/FrameMemory.hpp"
#include "SceneFramework.h"

#include <glm.hpp>

namespace Hayase
{
	class Editor : public Layer
	{
	public:
		Editor();
		~Editor();

		void OnAttach() override;
		void OnDetach() override;
		void Update(DeltaTime dt) override;
		void OnImGuiRender() override;
		void OnEvent(Event& e) override;

		void Begin();
		void End();

		void BlockEvents(bool b) { m_BlockEvents = b; }

	private:
		void CustomizeColors();

	private:
		Framebuffer* m_Framebuffer;
		glm::vec2 m_ViewportSize = glm::vec2(0.0f);
		Scene* m_ActiveScene;

		bool m_BlockEvents = true;

		bool m_ViewportFocused = false, m_ViewportHovered = false;

		
	};
}

#endif
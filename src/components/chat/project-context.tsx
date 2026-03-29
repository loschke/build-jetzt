"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ProjectContextValue {
  projectId: string | null
  projectName: string | null
  isSharedProject: boolean
  setProject: (id: string | null, name: string | null, isShared?: boolean) => void
}

const ProjectContext = createContext<ProjectContextValue>({
  projectId: null,
  projectName: null,
  isSharedProject: false,
  setProject: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [isSharedProject, setIsSharedProject] = useState(false)

  const setProject = useCallback((id: string | null, name: string | null, isShared?: boolean) => {
    setProjectId(id)
    setProjectName(name)
    setIsSharedProject(isShared ?? false)
  }, [])

  return (
    <ProjectContext.Provider value={{ projectId, projectName, isSharedProject, setProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}

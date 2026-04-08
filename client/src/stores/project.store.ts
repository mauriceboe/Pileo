import { create } from 'zustand';
import type { Project, Board, CreateProjectInput, UpdateProjectInput, ProjectMember, UserPublic } from '@pileo/shared';
import * as projectsApi from '../api/projects.api';
import * as boardsApi from '../api/boards.api';

export interface ProjectMemberWithUser extends ProjectMember {
  user?: UserPublic;
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  members: ProjectMemberWithUser[];
  boardsByProject: Record<string, Board[]>;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (project: Project | null) => void;
  fetchMembers: (projectId: string) => Promise<void>;
  uploadBackground: (projectId: string, file: File) => Promise<Project>;
  fetchAllBoards: () => Promise<void>;
  fetchBoardsForProject: (projectId: string) => Promise<void>;
  addBoardToProject: (projectId: string, board: Board) => void;
  removeBoardFromProject: (projectId: string, boardId: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  members: [],
  boardsByProject: {},
  isLoading: false,
  error: null,

  fetchProjects: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsApi.listProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects';
      set({ error: message, isLoading: false });
    }
  },

  createProject: async (input: CreateProjectInput): Promise<Project> => {
    const project = await projectsApi.createProject(input);
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  updateProject: async (projectId: string, input: UpdateProjectInput): Promise<void> => {
    const updated = await projectsApi.updateProject(projectId, input);
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? updated : project,
      ),
      selectedProject:
        state.selectedProject?.id === projectId ? updated : state.selectedProject,
    }));
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await projectsApi.deleteProject(projectId);
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
      selectedProject:
        state.selectedProject?.id === projectId ? null : state.selectedProject,
    }));
  },

  selectProject: (project: Project | null): void => {
    set({ selectedProject: project });
  },

  fetchMembers: async (projectId: string): Promise<void> => {
    try {
      const members = await projectsApi.listMembers(projectId);
      // The API may return members with embedded user info; cast accordingly
      set({ members: members as ProjectMemberWithUser[] });
    } catch {
      // Non-critical failure
    }
  },

  uploadBackground: async (projectId: string, file: File): Promise<Project> => {
    const updated = await projectsApi.uploadBackground(projectId, file);
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? updated : project,
      ),
      selectedProject:
        state.selectedProject?.id === projectId ? updated : state.selectedProject,
    }));
    return updated;
  },

  fetchAllBoards: async (): Promise<void> => {
    const { projects } = get();
    const results: Record<string, Board[]> = {};
    await Promise.all(
      projects.map(async (project) => {
        try {
          results[project.id] = await boardsApi.listBoards(project.id);
        } catch {
          results[project.id] = [];
        }
      }),
    );
    set({ boardsByProject: results });
  },

  fetchBoardsForProject: async (projectId: string): Promise<void> => {
    try {
      const boards = await boardsApi.listBoards(projectId);
      set((state) => ({
        boardsByProject: { ...state.boardsByProject, [projectId]: boards },
      }));
    } catch {}
  },

  addBoardToProject: (projectId: string, board: Board): void => {
    set((state) => ({
      boardsByProject: {
        ...state.boardsByProject,
        [projectId]: [...(state.boardsByProject[projectId] ?? []), board],
      },
    }));
  },

  removeBoardFromProject: (projectId: string, boardId: string): void => {
    set((state) => ({
      boardsByProject: {
        ...state.boardsByProject,
        [projectId]: (state.boardsByProject[projectId] ?? []).filter(
          (board) => board.id !== boardId,
        ),
      },
    }));
  },
}));

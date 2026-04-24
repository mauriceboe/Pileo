import { useEffect, useState, useCallback } from 'react';
import { X, UserPlus } from 'lucide-react';
import { PROJECT_MEMBER_ROLES } from '@pileo/shared';
import type { ProjectMember, ProjectMemberRole } from '@pileo/shared';
import * as projectsApi from '../../api/projects.api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import styles from './project-members.module.css';

const ROLE_OPTIONS = PROJECT_MEMBER_ROLES
  .filter((role) => role !== 'owner')
  .map((role) => ({
    value: role,
    label: role.charAt(0).toUpperCase() + role.slice(1),
  }));

interface ProjectMembersProps {
  projectId: string;
}

// Extended member type with user info for display purposes
interface MemberWithUser extends ProjectMember {
  displayName?: string;
  email?: string;
  avatarPath?: string | null;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
  };
}

function flattenMember(member: MemberWithUser): MemberWithUser {
  if (member.user) {
    return {
      ...member,
      displayName: member.user.displayName,
      email: member.user.email,
      avatarPath: member.user.avatarPath,
    };
  }
  return member;
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.listMembers(projectId);
      setMembers((data as MemberWithUser[]).map(flattenMember));
    } catch {
      // API error handled by the fetch client
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRoleChange = async (
    userId: string,
    role: ProjectMemberRole,
  ): Promise<void> => {
    try {
      await projectsApi.updateMemberRole(projectId, userId, { role });
      setMembers((previous) =>
        previous.map((member) =>
          member.userId === userId ? { ...member, role } : member,
        ),
      );
    } catch {
      // Revert would require re-fetching
    }
  };

  const handleRemove = async (userId: string): Promise<void> => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectsApi.removeMember(projectId, userId);
      setMembers((previous) =>
        previous.filter((member) => member.userId !== userId),
      );
    } catch {
      // API error handled by the fetch client
    }
  };

  const handleMemberAdded = (member: MemberWithUser): void => {
    setMembers((previous) => [...previous, flattenMember(member)]);
    setShowShareDialog(false);
  };

  if (isLoading) {
    return <p className={styles.empty}>Loading members...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Members ({members.length})</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowShareDialog(true)}>
          <UserPlus size={14} />
          Share
        </Button>
      </div>

      {members.length === 0 ? (
        <p className={styles.empty}>No members found.</p>
      ) : (
        <div className={styles.list}>
          {members.map((member) => {
            const name = member.displayName ?? member.userId;
            const isOwner = member.role === 'owner';

            return (
              <div key={member.id} className={styles.memberRow}>
                <Avatar name={name} src={member.avatarPath} size="md" />
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{name}</div>
                  {member.email && (
                    <div className={styles.memberEmail}>{member.email}</div>
                  )}
                </div>
                <div className={styles.memberActions}>
                  <div className={styles.roleSelectWrapper}>
                    <CustomSelect
                      value={isOwner ? 'owner' : member.role}
                      onChange={(value) =>
                        handleRoleChange(member.userId, value as ProjectMemberRole)
                      }
                      options={isOwner ? [{ value: 'owner', label: 'Owner' }] : ROLE_OPTIONS}
                      disabled={isOwner}
                    />
                  </div>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemove(member.userId)}
                    aria-label="Remove member"
                    disabled={isOwner}
                    style={isOwner ? { visibility: 'hidden' } : undefined}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        projectId={projectId}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onMemberAdded: (member: MemberWithUser) => void;
}

function ShareDialog({ open, onClose, projectId, onMemberAdded }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectMemberRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = (): void => {
    setEmail('');
    setRole('member');
    setError('');
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const member = await projectsApi.addMember(projectId, { email, role });
      resetForm();
      onMemberAdded(member as MemberWithUser);
    } catch (thrown: unknown) {
      const message = thrown instanceof Error ? thrown.message : 'Failed to add member';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Share Project">
      <form className={styles.shareForm} onSubmit={handleSubmit}>
        <p className={styles.shareHint}>
          Invite a user by their email address to collaborate on this project.
        </p>
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="colleague@example.com"
          required
        />
        <div className={styles.shareRoleSelect}>
          <label className={styles.shareRoleLabel}>Role</label>
          <CustomSelect
            value={role}
            onChange={(value) => setRole(value as ProjectMemberRole)}
            options={ROLE_OPTIONS}
          />
        </div>
        {error && <p className={styles.shareError}>{error}</p>}
        <div className={styles.shareActions}>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            <UserPlus size={14} />
            Add Member
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

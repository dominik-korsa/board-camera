import { ObjectId } from 'mongodb';
import { DbFolder, RecursiveRole } from './database/types';

export const rolePreference: Record<RecursiveRole | 'none', number> = {
  none: 0,
  viewer: 1,
  contributor: 2,
  editor: 3,
  admin: 4,
  owner: 5,
};

export function compareRoles(lhs: RecursiveRole | 'none', rhs: RecursiveRole | 'none'): -1 | 0 | 1 {
  const lPreference = rolePreference[lhs];
  const rPreference = rolePreference[rhs];
  if (lPreference < rPreference) return -1;
  if (lPreference > rPreference) return 1;
  return 0;
}

export function hasRole(folder: DbFolder, userId: ObjectId, role: RecursiveRole) {
  return compareRoles(folder.cache.userRecursiveRole[userId.toHexString()] ?? 'none', role) >= 0;
}

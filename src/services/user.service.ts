import { getUserProfile, isUserBanned, upsertUserProfile } from "../database";

export const userService = {
  getUserProfile,
  upsertUserProfile,
  isUserBanned,

  // Logic to ban/unban can be added here if needed,
  // currently strictly delegated to database functions
  // but good to have a service layer for future expansion.
};

import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../context/AuthContext";
import {
  getUserProfile,
  updateUserProfilePicture,
} from "../../services/firestore/userService";
import { uploadImageToStorage } from "../../services/storage/storageService";
import type { AppUserProfile } from "../../types/user/userTypes";

const PLACEHOLDER_AVATAR_URL =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function createLocalProfile(
  userId: string,
  email: string,
  profilePictureUrl: string | null
): AppUserProfile {
  return {
    uid: userId,
    email,
    userName: null,
    photoURL: null,
    profilePictureUrl,
    phone: null,
    createdAt: null,
    updatedAt: null,
  };
}

export interface ProfileViewModelResult {
  profileData: AppUserProfile | null;
  currentUserId: string;
  avatarPreviewUri: string | null;
  avatarImageUri: string;
  loadingProfile: boolean;
  uploadingProfilePicture: boolean;
  error: string;
  onPickAndUploadProfilePicture: (userId: string) => Promise<boolean>;
}

export default function useProfileViewModel(): ProfileViewModelResult {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<AppUserProfile | null>(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const currentUserId = user?.uid ?? "";
  const avatarImageUri =
    avatarPreviewUri ?? profileData?.profilePictureUrl ?? PLACEHOLDER_AVATAR_URL;

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!user?.uid) {
        if (isActive) {
          setProfileData(null);
          setAvatarPreviewUri(null);
          setLoadingProfile(false);
          setError("");
        }

        return;
      }

      setLoadingProfile(true);
      setError("");

      try {
        const data = await getUserProfile(user.uid);

        if (!isActive) {
          return;
        }

        setProfileData(
          data
            ? {
                ...data,
                profilePictureUrl: data.profilePictureUrl ?? null,
              }
            : createLocalProfile(user.uid, user.email ?? "", null)
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setProfileData(null);
        setError(
          getErrorMessage(loadError, "Could not load your profile details. Please try again.")
        );
      } finally {
        if (isActive) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [user?.uid]);

  const onPickAndUploadProfilePicture = async (userId: string): Promise<boolean> => {
    setError("");

    if (!userId.trim()) {
      setError("You must be signed in to update your profile picture.");
      return false;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Please allow photo library access to update your profile picture.");
        return false;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return false;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        setError("Could not read the selected image. Please try again.");
        return false;
      }

      setAvatarPreviewUri(asset.uri);
      setUploadingProfilePicture(true);

      const downloadUrl = await uploadImageToStorage(asset.uri, `profiles/${userId}/avatar.jpg`);
      await updateUserProfilePicture(userId, downloadUrl);

      setProfileData((currentProfile) => {
        if (!currentProfile) {
          return createLocalProfile(userId, user?.email ?? "", downloadUrl);
        }

        return {
          ...currentProfile,
          profilePictureUrl: downloadUrl,
        };
      });
      setAvatarPreviewUri(null);

      return true;
    } catch (uploadError) {
      setAvatarPreviewUri(null);
      setError(
        getErrorMessage(uploadError, "Could not update your profile picture. Please try again.")
      );
      return false;
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  return {
    profileData,
    currentUserId,
    avatarPreviewUri,
    avatarImageUri,
    loadingProfile,
    uploadingProfilePicture,
    error,
    onPickAndUploadProfilePicture,
  };
}

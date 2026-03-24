import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
} from "@/features/profile/api/profileApi";
import {
  profileSchema,
  type ProfileFormData,
} from "@/features/profile/schemas/profileSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          phoneNumber: profile.phoneNumber ?? "",
          bio: profile.bio ?? "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      updateProfile({
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phoneNumber: data.phoneNumber || null,
        bio: data.bio || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      reset(undefined, { keepValues: true });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB limit

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      avatarMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.profilePictureBase64 ? (
                <img
                  src={profile.profilePictureBase64}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {profile?.username?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarMutation.isPending}
              >
                <Camera className="mr-1 h-3 w-3" />
                {avatarMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
              {profile?.profilePictureBase64 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAvatarMutation.mutate()}
                  disabled={deleteAvatarMutation.isPending}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            JPG, PNG, or WebP. Max 2MB.
          </p>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-4"
          >
            {/* Read-only fields */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Username
                </Label>
                <Input value={profile?.username ?? ""} disabled />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
            </div>

            {/* Editable fields */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  First Name
                </Label>
                <Input
                  {...register("firstName")}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Last Name
                </Label>
                <Input
                  {...register("lastName")}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Phone Number
              </Label>
              <Input
                {...register("phoneNumber")}
                placeholder="Enter phone number"
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bio</Label>
              <textarea
                {...register("bio")}
                placeholder="Tell us about yourself"
                rows={3}
                className={cn(
                  "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30",
                  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "resize-none"
                )}
              />
              {errors.bio && (
                <p className="text-xs text-destructive">
                  {errors.bio.message}
                </p>
              )}
            </div>

            {/* Status messages */}
            {updateMutation.isSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                Profile updated successfully.
              </div>
            )}
            {updateMutation.isError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                Failed to update profile. Please try again.
              </div>
            )}

            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
            >
              <Save className="mr-1 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

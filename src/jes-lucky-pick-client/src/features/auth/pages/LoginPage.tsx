import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { login } from "@/features/auth/api/authApi";
import { setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/stores/authStore";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/loginSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const response = await login(data);
      setAccessToken(response.accessToken);
      setUser(response.user);
      navigate("/dashboard");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-600">
            Jes Lucky Pick
          </CardTitle>
          <CardDescription>
            Sign in to access your PCSO 6/42 predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                {...registerField("username")}
              />
              {errors.username && (
                <p className="text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...registerField("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

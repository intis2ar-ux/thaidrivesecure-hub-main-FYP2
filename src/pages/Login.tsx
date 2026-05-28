import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { z } from "zod";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import tdsLogo from "@/assets/tds-logo.png";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateEmail = (emailToValidate: string): boolean => {
    const result = emailSchema.safeParse(emailToValidate);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: emailError || "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions",
      });
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to send reset email";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      // Set persistence based on "Remember me" checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const result = await login(email, password);
      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in",
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Please check your credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={tdsLogo} 
            alt="ThaiDriveSecure" 
            className="h-40 w-auto mx-auto mb-4"
          />
          <p className="text-muted-foreground mt-2">
            Staff & Admin Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your staff or admin account to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@thaidrivesecure.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={emailError ? "border-destructive" : ""}
                  required
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm text-muted-foreground hover:text-accent"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                >
                  {isResetting ? "Sending..." : "Forgot password?"}
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 ThaiDriveSecure. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;

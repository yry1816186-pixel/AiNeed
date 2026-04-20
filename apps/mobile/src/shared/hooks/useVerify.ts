import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

export function useVerify(isAuthenticated: boolean, redirectPath: string = "/login") {
  const router = useRouter();
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !hasVerified.current) {
      hasVerified.current = true;
      router.replace(redirectPath);
    }
  }, [isAuthenticated, redirectPath, router]);

  return isAuthenticated;
}

export default useVerify;

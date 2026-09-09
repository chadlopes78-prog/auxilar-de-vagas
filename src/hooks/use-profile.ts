import { useEffect, useState } from "react";
import { ensureProfile, getMyProfile } from "@/lib/server/account";
import type { Profile } from "@/lib/types";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";

export function useProfile() {
  const { isPending } = useCurrentUserState();
  const user = useCurrentUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    ensureProfile({ data: { email: user.primaryEmail, name: user.displayName } })
      .then((res) => setProfile(res.profile))
      .catch(() => getMyProfile().then(setProfile).catch(() => setProfile(null)))
      .finally(() => setLoading(false));
  }, [isPending, user?.id]);

  return { profile, loading, user, isPending, setProfile };
}

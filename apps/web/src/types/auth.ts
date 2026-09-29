export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
  emailVerified?: boolean;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  role?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    organization: AuthOrganization | null;
    tokens: AuthTokens;
  };
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    organization: AuthOrganization;
    tokens: AuthTokens;
  };
};

export type MeResponse = {
  success: boolean;
  data: {
    user: AuthUser;
    organizations: AuthOrganization[];
  };
};

export type VerifyEmailResponse = {
  success: boolean;
  message: string;
  data: {
    verified: boolean;
    user: {
      id: string;
      email: string;
      emailVerifiedAt: string | null;
    };
  };
};

export type ResendVerificationResponse = {
  success: boolean;
  message: string;
  data: {
    sent?: boolean;
    alreadyVerified?: boolean;
    skipped?: boolean;
    message?: string;
    expiresAt?: string | null;
    devVerificationUrl?: string | null;
  };
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
  data: {
    reset: boolean;
  };
};

export type ChangePasswordResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
};

export type AuthSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export type ListSessionsResponse = {
  success: boolean;
  data: {
    sessions: AuthSession[];
  };
};




export type CurrentOrganization = AuthOrganization & {
  plan: string;
  createdAt: string;
};

export type CurrentOrganizationResponse = {
  success: boolean;
  data: {
    organization: CurrentOrganization;
  };
};

export type UpdateOrganizationResponse = {
  success: boolean;
  message: string;
  data: {
    organization: CurrentOrganization;
  };
};

export type TransferOrganizationResponse = {
  success: boolean;
  message: string;
  data: {
    organization: CurrentOrganization;
  };
};

export type OrganizationMembersResponse = {
  success: boolean;
  data: {
    members: {
      id: string;
      role: string;
      joinedAt: string;
      user: AuthUser;
    }[];
  };
};

export type UpdateOrganizationMemberResponse = {
  success: boolean;
  message: string;
  data: {
    member: {
      id: string;
      role: string;
      joinedAt: string;
      user: AuthUser;
    };
  };
};

export type OrganizationInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type ListOrganizationInvitesResponse = {
  success: boolean;
  data: {
    invites: OrganizationInvite[];
  };
};

export type CreateOrganizationInviteResponse = {
  success: boolean;
  message: string;
  data: {
    invite: OrganizationInvite;
    inviteUrl: string | null;
  };
};

export type PreviewOrganizationInviteResponse = {
  success: boolean;
  data: {
    email: string;
    role: string;
    organizationName: string;
    expiresAt: string;
    accountExists: boolean;
  };
};

export type AcceptOrganizationInviteResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    organization: AuthOrganization;
    tokens: AuthTokens;
  };
};
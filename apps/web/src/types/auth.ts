export type AuthUser = {
  id: string;
  name: string;
  email: string;
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




export type CurrentOrganizationResponse = {
  success: boolean;
  data: {
    organization: AuthOrganization & {
      plan: string;
      createdAt: string;
    };
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
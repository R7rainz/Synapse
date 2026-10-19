export type UserDocument = {
  id: string;
  title: string;
  chunk_count: number;
  created_at: string;
};

export type APIKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export type CreatedAPIKey = {
  api_key: string;
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
};

export type GatewaySummary = {
  provider: string;
  window: "24h";
  request_count: number;
  error_count: number;
  rate_limited_count: number;
  average_latency_ms: number;
  user_requests_per_minute: number;
  api_key_requests_per_minute: number;
  input_tokens: number;
  output_tokens: number;
  monthly_tokens: number;
  monthly_token_quota: number;
};

export type GatewayUsagePeriod = {
  request_count: number;
  error_count: number;
  rate_limited_count: number;
  average_latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type GatewayUsageModel = {
  model: string;
  request_count: number;
  error_count: number;
  average_latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type GatewayUsage = {
  last_24h: GatewayUsagePeriod;
  month_to_date: GatewayUsagePeriod;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
  models: GatewayUsageModel[];
};

export type GatewayRequest = {
  id: string;
  api_key_id?: string;
  api_key_name?: string;
  api_key_prefix?: string;
  provider: string;
  model: string;
  status_code: number;
  latency_ms: number;
  created_at: string;
};

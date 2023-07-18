package com.ubench.demo.jwks.client.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;

@Builder
@Data
@ToString
@JsonDeserialize(builder = AccessTokenResponse.AccessTokenResponseBuilder.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AccessTokenResponse {

      @JsonProperty("access_token")
      private String accessToken;

      @JsonProperty("expires_in")
      private int expiresIn;

      @JsonProperty("refresh_token")
      private int refreshExpiresIn;

      @JsonProperty("refresh_token")
      private String tokenType;

      @JsonProperty("not-before-policy")
      private int notBeforePolicy;

      @JsonProperty("scope")
      private String scope;

      @JsonPOJOBuilder(withPrefix = "")
      public static class AccessTokenResponseBuilder {}
}

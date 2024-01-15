package com.ubench.demo.jwks.client;

import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import lombok.extern.log4j.Log4j2;
import reactor.core.publisher.Mono;
import com.ubench.demo.jwks.client.component.SignedJwtComponent;
import com.ubench.demo.jwks.client.response.AccessTokenResponse;

@SpringBootApplication
@ComponentScan({
      "com.ubench.demo.jwks.common",
      "com.ubench.demo.jwks.client.component",
      "com.ubench.demo.jwks.client.response"
})
@Log4j2
public class RequestBearerApp implements CommandLineRunner {

   private final SignedJwtComponent signedJwtComponent;
   private final WebClient.Builder webClientBuilder;

   @Value("${ubench.auth.client-id}")
   private String clientId;

   @Value("${ubench.auth.host}")
   private String authHost;

   @Value("${ubench.auth.realm}")
   private String authRealm;

   @Autowired
   public RequestBearerApp(final SignedJwtComponent signedJwtComponent,
                           final WebClient.Builder webClientBuilder) {
      this.signedJwtComponent = signedJwtComponent;
      this.webClientBuilder = webClientBuilder;
   }

   @Override
   public void run(String... args) throws Exception {

      log.info("Using auth host: {}, realm {} and clientid {}", authHost, authRealm, clientId);

      final String jwtString = signedJwtComponent.generateSignedJwt();
      final MultiValueMap<String, String> formData = prepareRequestData(jwtString);
      logRequestData(formData);

      final var response = retrieveAccessToken(formData).block();
      log.info(response.getAccessToken());
   }

   public Mono<AccessTokenResponse> retrieveAccessToken(final MultiValueMap<String, String> formData) {
      return webClientBuilder
            .baseUrl(authHost)
            .build()
            .post()
            .uri(uriBuilder->uriBuilder
                  .path("/auth/realms/{realm}/protocol/openid-connect/token")
                  .build(authRealm))
            .body(BodyInserters.fromFormData(formData))
            .retrieve()
            .bodyToMono(AccessTokenResponse.class)
            .doOnError(error->{
               if (error instanceof final WebClientResponseException.BadRequest badRequest) {
                  log.error("Bad request: {}", badRequest.getResponseBodyAsString());
               } else {
                  log.error("Error while retrieving access token", error);
               }
            })
            ;
   }

   private void logRequestData(MultiValueMap<String, String> formData) {
      log.debug("Sending this information to the UBench authentication server:");
      log.debug(formData.entrySet()
                        .stream()
                        .map(entry->entry.getKey() + "=" + entry.getValue().get(0))
                        .collect(Collectors.joining("&")));
   }

   private MultiValueMap<String, String> prepareRequestData(String jwtString) {
      final var formData = new LinkedMultiValueMap<String, String>();
      formData.add("grant_type", "client_credentials");
      formData.add("client_id", clientId);
      formData.add("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
      formData.add("client_assertion", jwtString);
      return formData;
   }

   public static void main(String[] args) {
      new SpringApplicationBuilder(RequestBearerApp.class)
            .web(WebApplicationType.NONE)
            .run(args);

   }
}

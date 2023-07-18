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
import org.springframework.web.client.RestTemplate;
import lombok.extern.log4j.Log4j2;
import com.ubench.demo.jwks.client.response.AccessTokenResponse;
import com.ubench.demo.jwks.client.component.SignedJwtComponent;

@SpringBootApplication
@ComponentScan({
      "com.ubench.demo.jwks.common",
      "com.ubench.demo.jwks.client.component",
      "com.ubench.demo.jwks.client.response"
})
@Log4j2
public class RequestBearerApp implements CommandLineRunner {

   private final SignedJwtComponent signedJwtComponent;

   @Value("${ubench.auth.client-id}")
   private String clientId;

   @Value("${ubench.auth.host}")
   private String authHost;

   @Value("${ubench.auth.realm}")
   private String authRealm;

   @Autowired
   public RequestBearerApp(final SignedJwtComponent signedJwtComponent) {
      this.signedJwtComponent = signedJwtComponent;
   }

   @Override
   public void run(String... args) throws Exception {

      log.info("Using auth host: {}, realm {} and clientid {}", authHost, authRealm, clientId);

      final String jwtString = signedJwtComponent.generateSignedJwt();

      final var restTemplate = new RestTemplate();

      final MultiValueMap<String, String> requestMap = new LinkedMultiValueMap<>();
      requestMap.add("grant_type", "client_credentials");
      requestMap.add("client_id", clientId);
      requestMap.add("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
      requestMap.add("client_assertion", jwtString);

      log.debug("Sending this information to the UBench authentication server:");
      log.debug(requestMap.entrySet()
            .stream()
            .map(entry-> entry.getKey() + "=" + entry.getValue().get(0))
            .collect(Collectors.joining("&")));

      final var response = restTemplate.postForEntity(String.format("%s/auth/realms/%s/protocol/openid-connect/token", authHost, authRealm),
                                                      requestMap,
                                                      AccessTokenResponse.class);

      log.info(response.getStatusCode());
      log.info(response.getBody().getAccessToken());

   }


   public static void main(String[] args)  {

      new SpringApplicationBuilder(RequestBearerApp.class)
            .web(WebApplicationType.NONE)
            .run(args);

   }
}

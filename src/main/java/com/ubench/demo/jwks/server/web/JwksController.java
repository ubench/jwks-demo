package com.ubench.demo.jwks.server.web;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ubench.demo.jwks.server.component.JwkComponent;

@RestController
public class JwksController {

   private JwkComponent jwkComponent;

   @Autowired
   public JwksController(final JwkComponent jwkComponent) {
      this.jwkComponent = jwkComponent;
   }

   @GetMapping(path = "/.well-known/jwks.json", produces = "application/json")
   public String jwks() {
      return "{\"keys\": [" + jwkComponent.generateJWKasJson() + "]}";
   }
}

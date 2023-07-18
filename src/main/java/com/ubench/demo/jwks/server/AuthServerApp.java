package com.ubench.demo.jwks.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan({ "com.ubench.demo.jwks.common",
                 "com.ubench.demo.jwks.server.component",
                 "com.ubench.demo.jwks.server.web"
})
public class AuthServerApp {

   public static void main(String[] args) {
      SpringApplication.run(AuthServerApp.class, args);
   }
}
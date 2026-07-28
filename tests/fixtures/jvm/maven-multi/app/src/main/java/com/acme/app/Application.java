package com.acme.app;
import com.acme.api.Greeting;
import java.util.List;
import static java.util.Objects.requireNonNull;
@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    List.of(requireNonNull(new Greeting("hello")));
  }
}

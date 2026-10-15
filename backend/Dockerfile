FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 lifeos
WORKDIR /app
COPY --from=build /src/target/lifeos-backend-*.jar app.jar
USER lifeos
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

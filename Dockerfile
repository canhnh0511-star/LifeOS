# Single deployable (Railway, or any Docker host): the SPA is built in and served by Spring Boot, so the API and the UI
# share one origin and the SameSite session cookie just works.
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
ENV VITE_API_MODE=real
RUN npm run build

FROM eclipse-temurin:21-jdk AS api
WORKDIR /src
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY backend/src src
COPY --from=web /web/dist src/main/resources/static
RUN ./mvnw -q -B -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 lifeos
WORKDIR /app
COPY --from=api /src/target/lifeos-backend-*.jar app.jar
USER lifeos
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

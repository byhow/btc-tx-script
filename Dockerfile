# Use the official Deno image as a base
FROM denoland/deno:latest

# Set the working directory
WORKDIR /app

# Copy the application files
COPY . .

# Cache the dependencies as a layer
RUN deno cache src/index.ts

# Set the entry point for the container
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "src/index.ts"]

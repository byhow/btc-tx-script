FROM denoland/deno:alpine
WORKDIR /app

# Install netcat
RUN apk add --no-cache netcat-openbsd
# Copy the application files
COPY . .

# Copy the wait-for-it script
COPY wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

# Cache the dependencies as a layer
RUN deno cache index.ts

# Set the entry point for the container
CMD ["./wait-for-it.sh", "mongodb", "27017", "--", "deno", "run", "--allow-net", "--allow-env", "index.ts"]

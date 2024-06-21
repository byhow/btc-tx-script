# Use the official Deno image
FROM denoland/deno:alpine

# Set the working directory inside the container
WORKDIR /app

# Copy your application code to the container
COPY . .

# Expose the port your app runs on
EXPOSE 8000

# Run your Deno application
CMD ["run", "--allow-net", "index.ts"]
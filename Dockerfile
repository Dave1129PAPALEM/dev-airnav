# Use a stable, official Node.js image (using alpine since it is cached on the isolated Jenkins server)
FROM node:alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Optimize performance for Express apps
ENV NODE_ENV=production

# Copy package files first to cache the dependencies
COPY package*.json ./

# Install exact dependencies from package-lock.json
RUN npm ci

# Copy the rest of the application files
COPY . .

# Document that the app listens on port 3001 by default
EXPOSE 3001

# Start the application
CMD ["node", "app.js"]

# Dockerfile pour frontend-app

# --- Étape de Build ---
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build # Construit l'application pour la production dans le dossier 'dist'

# --- Étape de Production ---
FROM nginx:stable-alpine
# Copier les fichiers statiques construits de l'étape précédente vers le répertoire de Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copier une configuration Nginx personnalisée si nécessaire (voir ci-dessous)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 
CMD ["nginx", "-g", "daemon off;"]
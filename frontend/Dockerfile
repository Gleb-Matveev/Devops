FROM nginx:1.27-alpine

ENV BACKEND_URL=http://backend:8000

COPY --chmod=644 nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=644 index.html app.js style.css /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

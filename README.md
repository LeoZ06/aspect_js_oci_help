# Aspect JS OCI Image

This is a reproduction of my attempt to bundle a React app into an OCI image using Aspect's JS rules.  
The end goal is for this OCI image to get pushed onto ECS Fargate.  

The sources of truth are:  
https://github.com/bazelbuild/examples/tree/main/frontend/react  
https://github.com/aspect-build/rules_js/blob/main/e2e/js_image_oci/

Currently, the layers that include my actual code and node_modules are not in the OCI image.

The frontend project can be run via cd core/data/api/frontend and npm run dev.
This starts Vite on localhost:5173, which fetches the backend.
For simplicity, only the root component is included, which fetches properly.

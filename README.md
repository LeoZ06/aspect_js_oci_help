# Aspect JS OCI Image

This is a reproduction of my attempt to bundle a React app into an OCI image using Aspect's JS rules.  
The end goal is for this OCI image to get pushed onto ECS Fargate.

The sources of truth are:  
https://github.com/aspect-build/rules_js  
https://github.com/aspect-build/rules_js/tree/main/docs
https://github.com/bazelbuild/examples/tree/main/frontend/react  
https://github.com/aspect-build/rules_js/blob/main/e2e/js_image_oci/

Currently, the layers that include my actual code and node_modules are not in the OCI image.  
This results in an error wherein running the OCI image opens localhost:5173 but does not render anything.

The frontend project can be run via cd core/data/api/frontend and npm run dev.  
This starts Vite on localhost:5173, which fetches the backend.  
For simplicity, only the root component is included, which fetches properly.

Note: I'm doing this on my Mac in a private repo, so I don't have Bazel at the moment.  
Because of this, I'm removing lock files that are auto-generated via Bazel.  
The most notable examples are MODULE.bazel.lock and pnpm-lock.yaml.  
Frankly, I'm not sure how the former is installed.  
To install the latter, execute $ bazel run -- @pnpm//:pnpm --dir $PWD install --lockfile-only.  
Technically this raises the risk of this repo being less accurate to the actual version.  
However, there were never any issues with running Vite using Bazel, so I doubt there's any issue with packages.
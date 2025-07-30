load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_image_layer", "js_library", "js_run_binary")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//core/data/api/frontend:vite/package_json.bzl", "bin")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_load", "oci_push")

npm_link_all_packages(name = "node_modules")

RUNTIME_DEPS = [
    "//core/data/api/frontend/src:src",
    "index.html",
    "package.json",
    ":node_modules/@tanstack/react-table",
    ":node_modules/date-fns",
    ":node_modules/date-fns-tz",
    ":node_modules/react",
    ":node_modules/react-dom",
    ":node_modules/react-router-dom",
    ":node_modules/recharts",
]

js_library(
    name = "vite.config",
    srcs = ["vite.config.js"],
    data = [
        ":node_modules/@vitejs/plugin-react",
        ":node_modules/vite",
    ],
    visibility = ["//visibility:public"],
)

bin.vite_binary(
    name = "vite",
    chdir = package_name(),
    data = ["vite.config"],
)

js_run_binary(
    name = "build",
    srcs = RUNTIME_DEPS,
    args = ["build"],
    mnemonic = "ViteBuild",
    out_dirs = ["dist"],
    tool = ":vite",
)

bin.vite_binary(
    name = "frontend_binary",
    args = ["preview"],
    chdir = package_name(),
    data = [":build"],
)

platform(
    name = "linux_amd64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
)

platform(
    name = "linux_arm64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:arm64",
    ],
)

js_image_layer(
    name = "frontend_layer",
    binary = ":frontend_binary",
    platform = select({
        "@platforms//cpu:arm64": ":linux_arm64",
        "@platforms//cpu:x86_64": ":linux_amd64",
    }),
    root = "/app",
    tags = ["no-remote-exec"],
    visibility = ["//visibility:__pkg__"],
)

oci_image(
    name = "frontend_image",
    base = "@debian_slim_linux_amd64",
    cmd = ["/app/core/data/api/frontend/frontend_binary"],
    entrypoint = ["/usr/bin/bash"],
    tars = [":frontend_layer"],
    visibility = ["//visibility:public"],
    workdir = select({
        "@aspect_bazel_lib//lib:bzlmod": "/app/core/data/api/frontend/frontend_binary.runfiles/_main",
        "//conditions:default": "/app/core/data/api/frontend/frontend_binary.runfiles/__main__",
    }),
)

oci_load(
    name = "load_frontend_image",
    image = ":frontend_image",
    repo_tags = ["data-api-frontend:latest"],
    tags = ["manual"],
)

expand_template(
    name = "frontend_image_tags",
    out = "frontend_tags.txt",
    stamp_substitutions = {"latest": "{{STABLE_GIT_REF_VERSION}}"},
    template = ["latest"],
)

oci_push(
    name = "push_frontend_image",
    image = ":frontend_image",
    remote_tags = ":frontend_image_tags",
    repository = "891377295341.dkr.ecr.us-west-2.amazonaws.com/dev-data-api-frontend",
    tags = ["manual"],
)

module.exports = {
  client: {
    service: {
      name: "smokemap",
      url: "https://smokemap-django-backend-git-staging-muxalko.vercel.app/graphql",
    },
    excludes: ['node_modules/**/*', "src/graphql/__generated__/*.ts"]
  },
};

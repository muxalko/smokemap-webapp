module.exports = {
  client: {
    service: {
      name: "smokemap",
      url: "https://smokemap-django-backend-git-feature-recentchanges-muxalko.vercel.app/graphql",
    },
    excludes: ['node_modules/**/*', "src/graphql/__generated__/*.ts"]
  },
};

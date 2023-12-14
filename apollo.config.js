module.exports = {
  client: {
    service: {
      name: "smokemap",
      url: "http://192.168.56.5:8000/graphql/",
    },
    excludes: ['node_modules/**/*', "src/graphql/generated/*.ts"]
  },
};

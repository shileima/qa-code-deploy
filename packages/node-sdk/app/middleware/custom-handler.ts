
function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  module.exports = (_options, app) => {
      return async function someMiddleware(ctx, next) {
        const regex = /\/([^\/]+)\/[^\/]*$/;
  
        const lastRegex = /\/([^\/]+)$/;
  
        const match = ctx.path.match(regex);
  
        const lastMatch = ctx.path.match(lastRegex);
        const customFunction = 'Custom'+ capitalizeFirstLetter(match[1]) + capitalizeFirstLetter(lastMatch[1]) ;
  
        if (match && app[customFunction]) {
          app[customFunction](ctx)
        }
        await next();
      };
  }
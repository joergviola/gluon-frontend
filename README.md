# gluon frontend

## Installation

The gluon frontend is VueJS-based, so start by creating a vue-project:

````
vue create frontend
? Please pick a preset: Manually select features
? Check the features needed for your project: Babel, PWA, Router
? Use history mode for router? (Requires proper server setup for index fallback in production) No
? Where do you prefer placing config for Babel, ESLint, etc.? In package.json
? Save this as a preset for future projects? No
cd frontend
````

Don't forget to include the `vue-router`.

Now install required npm-modules:

````
yarn add gluon-frontend
yarn add --dev sass-loader
yarn add --dev sass
yarn install
````

Create your store file, at least for holding dynamic breadcrums, but you can add more....
`util/Store.js':

````
export default {
  breadcrumbs: [],
}
````

In order to user the standard layout and routing of gluon, use the corresponding gluon components in your main.js:

````
export default {
  breadcrumbs: [],
}
````



import { hot } from 'react-hot-loader/root';
import React from 'react';
import { Provider, useSelector } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { Switch, Route, Redirect } from 'react-router-dom';

import history from 'services/history.service';
import * as loaderService from 'services/loader.service';
import * as socketService from 'services/socketIo.service';

import store from 'resources/store';
import * as userActions from 'resources/user/user.actions';
import * as userSelectors from 'resources/user/user.selectors';

import Loading from 'components/loading';
import { ErrorBoundary } from 'components/error-boundary';

import { routes, scope, layout } from 'routes';
import AuthLayout from 'layouts/auth';
import MainLayout from 'layouts/main';
import NotFound from 'pages/not-found';

import 'styles/main.pcss';

function PrivateScope({ children }) {
  const authenticated = useSelector(userSelectors.getAuthenticated);

  React.useEffect(() => {
    if (socketService.disconnected()) socketService.connect();
  }, []);

  if (!authenticated) {
    const searchParams = new URLSearchParams({ to: window.location.pathname });
    return (
      <Redirect
        to={routes.signIn.url({
          search: searchParams.toString(),
        })}
      />
    );
  }

  return children;
}

const scopeToComponent = {
  [scope.PRIVATE]: PrivateScope,
  [scope.PUBLIC]: ({ children }) => children,
};

const layoutToComponent = {
  [layout.MAIN]: MainLayout,
  [layout.AUTH]: AuthLayout,
  [layout.NONE]: ({ children }) => children,
};

const spaces = [];

Object.values(scope).forEach((s, scopeIndex) => {
  Object.values(layout).forEach((l, layoutIndex) => {
    spaces.push({
      id: `scope-${scopeIndex}-layout-${layoutIndex}`,
      scope: scopeToComponent[s],
      layout: layoutToComponent[l],
      routes: Object.values(routes).filter((r) => r.scope === s && r.layout === l),
    });
  });
});

function App() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function init() {
      try {
        await store.dispatch(userActions.getCurrentUser());
      } catch (error) {
        console.log(error); // eslint-disable-line no-console
      } finally {
        setLoading(false);
        loaderService.hide();
      }
    }

    init();
  }, []);

  if (loading) return null;

  return (
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <ErrorBoundary fallback={<h1>Error!</h1>}>
          <React.Suspense fallback={<Loading />}>
            <Switch>
              {spaces.map((space) => (
                <Route key={space.id} exact path={space.routes.map((r) => r.path)}>
                  <space.scope>
                    <space.layout>
                      <Switch>
                        {space.routes.map((r) => (
                          <Route
                            key={r.name}
                            exact={r.exact}
                            path={r.path}
                            component={r.component}
                          />
                        ))}
                      </Switch>
                    </space.layout>
                  </space.scope>
                </Route>
              ))}
              <Route path="*" component={NotFound} />
            </Switch>
          </React.Suspense>
        </ErrorBoundary>
      </ConnectedRouter>
    </Provider>
  );
}

export default hot(App);

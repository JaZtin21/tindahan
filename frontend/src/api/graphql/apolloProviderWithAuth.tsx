import { ApolloClient, ApolloProvider, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo, useState, createContext, useContext, useRef } from 'react';
import { Observable } from '@apollo/client/utilities';
import { REFRESH_TOKEN_MUTATION, LOGIN_MUTATION } from './auth/auth-queries';
import { ME_QUERY } from './user/user-queries';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8080/query';

// Create a basic Apollo client for auth operations (without auth link)
const authClient = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_ENDPOINT }),
  cache: new InMemoryCache(),
});

// Define user info type
interface UserInfo {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    aliasName?: string;
    isVerified?: boolean;
    isAdmin?: boolean;
    roleObject?: {
        role?: string;
        permissions?: string[];
        id?: number;
        userId?: string;
        createdAt?: string;
        updatedAt?: string;
    };
    [key: string]: any;
}

// Enhanced Auth context type
interface AuthContextType {
    isAuthenticated: boolean;
    userInfo: UserInfo | null;
    jwt: string;
    logoutAndClear: () => void;
    setUserJwt: (token: string) => void;
    setUserInfo: (info: UserInfo) => void;
    refreshUserInfo: () => Promise<void>;
    isLoading: boolean;
}

// Create the auth context with a more complete type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an ApolloProviderWithAuth');
    }
    return context;
};

const ApolloProviderWithAuth = ({ children }: any) => {
    const isAdminRequest = true;
    const { getAccessTokenSilently, logout } = useAuth0();
    const [jwt, setJwt] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const jwtRef = useRef<string>('');
    const isRefreshingRef = useRef(false);
    const failedQueueRef = useRef<Array<{
        resolve: (value: string) => void;
        reject: (error: any) => void;
    }>>([]);
    
    const processQueue = (error: any, token: string | null) => {
        failedQueueRef.current.forEach(promise => {
            if (error) {
                promise.reject(error);
            } else {
                promise.resolve(token!);
            }
        });
        failedQueueRef.current = [];
    };

    useEffect(() => {
        jwtRef.current = jwt;
    }, [jwt]);
    
    const setUserJwt = (token: string) => {
        setJwt(token);
        jwtRef.current = token;
        setIsAuthenticated(!!token);
    };

    const updateUserInfo = (info: UserInfo) => {
        setUserInfo(info);
    };

    const refreshUserInfo = async (): Promise<void> => {
        if (!jwt) return;

        console.log('refreshing user info');
        setIsLoading(true);
        try {
            const { data } = await authClient.query({
                query: ME_QUERY,
                context: {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                }
            });
            if (data?.me?.data) {
                setUserInfo(data.me.data);
            }
        } catch (error) {
            logoutAndClear();
            console.error('Failed to refresh user info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const logoutAndClear = async () => {
        if (window.location.pathname !== '/login') {
            setIsAuthenticated(false);
            setJwt('');
            setUserInfo(null);
            localStorage.removeItem('refresh_token');
            logout({
                logoutParams: {
                    returnTo: window.location.origin + '/login'
                }
            });
        }
    };

    useEffect(() => {
        const authenticate = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authError = urlParams.get('error');
            if (authError === 'access_denied') {
                console.log('Auth0 denied access:', urlParams.get('error_description'));
                logout({
                    logoutParams: {
                        returnTo: window.location.origin + '/login'
                    }
                });
                return;
            }

            if (window.location.pathname === '/admin-callback' && !authError) {
                console.log('Admin login successful, redirecting to dashboard');
                window.location.href = '/';
            }

            if (isAuthenticated && jwt) {
                setIsLoading(false);
                return;
            }

            if (window.location.pathname === '/login') {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const token = await getAccessTokenSilently();

                const { data: loginData } = await authClient.mutate({
                    mutation: LOGIN_MUTATION,
                    variables: {
                        input: {
                            email: '',
                            password: '',
                            auth0Token: token,
                            provider: 'google',
                            isAdminRequest: isAdminRequest
                        }
                    }
                });

                const loginResponse = loginData?.login;
                if (loginResponse?.success && loginResponse?.data) {
                    setUserInfo(loginResponse.data.user);
                    setJwt(loginResponse.data.accessToken);
                    jwtRef.current = loginResponse.data.accessToken;
                    // Store refresh token
                    if (loginResponse.data.refreshToken) {
                        localStorage.setItem('refresh_token', loginResponse.data.refreshToken);
                    }
                    setIsAuthenticated(true);
                } else {
                    throw new Error(loginResponse?.message || 'Login failed');
                }
            } catch (error: any) {
                console.error(error);

                if (error.response?.status === 403) {
                    console.log('Admin access denied:', error.response.data.error);
                    logoutAndClear();
                    return;
                }

                setIsAuthenticated(false);
                logoutAndClear();
            } finally {
                setIsLoading(false);
            }
        };

        authenticate();
    }, [getAccessTokenSilently, isAuthenticated, jwt]);

    const client = useMemo(() => {
        const httpLink = new HttpLink({
            uri: GRAPHQL_ENDPOINT,
        });

        const authLink = setContext((_, { headers }) => {
            return {
                headers: {
                    ...headers,
                    Authorization: jwtRef.current ? `Bearer ${jwtRef.current}` : '',
                },
            };
        });

        const errorLink = onError(({ graphQLErrors, operation, forward }) => {
            let shouldRetry = false;

            if (graphQLErrors) {
                for (const err of graphQLErrors) {
                    if (
                        err.extensions?.code === 'UNAUTHENTICATED' ||
                        err.message.toLowerCase().includes('jwt expired')
                    ) {
                        shouldRetry = true;
                    }
                }
            }

            if (shouldRetry) {
                const hasRetried = operation.getContext().hasRetried || false;
                
                if (hasRetried) {
                    console.warn('Already retried this operation, not retrying again.');
                    return;
                }

                return new Observable(observer => {
                    if (isRefreshingRef.current) {
                        const queuePromise = new Promise<string>((resolve, reject) => {
                            failedQueueRef.current.push({ resolve, reject });
                        });
                        
                        queuePromise
                            .then(newToken => {
                                operation.setContext({
                                    headers: {
                                        ...operation.getContext().headers,
                                        Authorization: `Bearer ${newToken}`,
                                    },
                                    hasRetried: true
                                });
                                
                                const subscriber = forward(operation).subscribe({
                                    next: observer.next.bind(observer),
                                    error: observer.error.bind(observer),
                                    complete: observer.complete.bind(observer),
                                });
                                
                                return () => subscriber.unsubscribe();
                            })
                            .catch(error => {
                                observer.error(error);
                            });
                        
                        return;
                    }
                    
                    isRefreshingRef.current = true;
                    
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (!refreshToken) {
                        isRefreshingRef.current = false;
                        logoutAndClear();
                        observer.error(new Error('No refresh token available'));
                        return;
                    }

                    // Perform token refresh using GraphQL mutation
                    authClient.mutate({
                        mutation: REFRESH_TOKEN_MUTATION,
                        variables: {
                            input: { refreshToken }
                        }
                    })
                    .then(refreshResult => {
                        const refreshResponse = refreshResult.data?.refreshToken;
                        if (!refreshResponse?.success || !refreshResponse?.data) {
                            throw new Error(refreshResponse?.message || 'Token refresh failed');
                        }
                        
                        const newJwt = refreshResponse.data.accessToken;
                        const newRefreshToken = refreshResponse.data.refreshToken;
                        
                        localStorage.setItem('refresh_token', newRefreshToken);
                        
                        setJwt(newJwt);
                        jwtRef.current = newJwt;
                        
                        processQueue(null, newJwt);
                        
                        operation.setContext({
                            headers: {
                                ...operation.getContext().headers,
                                Authorization: `Bearer ${newJwt}`,
                            },
                            hasRetried: true
                        });

                        const subscriber = forward(operation).subscribe({
                            next: observer.next.bind(observer),
                            error: observer.error.bind(observer),
                            complete: observer.complete.bind(observer),
                        });

                        return () => subscriber.unsubscribe();
                    })
                    .catch(error => {
                        console.error('Token refresh failed:', error);
                        processQueue(error, null);
                        logoutAndClear();
                        observer.error(error);
                    })
                    .finally(() => {
                        isRefreshingRef.current = false;
                    });
                });
            }
        });

        return new ApolloClient({
            link: from([errorLink, authLink, httpLink]),
            cache: new InMemoryCache(),
        });
    }, []);

    const authContextValue: AuthContextType = {
        isAuthenticated,
        userInfo,
        jwt,
        logoutAndClear,
        setUserJwt,
        setUserInfo: updateUserInfo,
        refreshUserInfo,
        isLoading
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            <ApolloProvider client={client}>{children}</ApolloProvider>
        </AuthContext.Provider>
    );
};

export default ApolloProviderWithAuth;

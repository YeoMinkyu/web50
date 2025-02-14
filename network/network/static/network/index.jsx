const StatesContext = React.createContext(null);
const DispatchContext = React.createContext(null);


const ACTION = {
    SETCURRENTVIEW: 'setCurrentView',
    SETLOGGEDINUSER: 'setLoggedInUser',
    SETPOSTS: 'setPosts',
    SETSELECTEDUSER: 'setSelectedUser',
    SETPAGINATIONINFO: 'setPaginationInfo',
    RESETPAGINATIONINFO: 'resetPaginationInfo',
}


function SocialNetworkApp() {
    const [states, dispatch] = React.useReducer(statesReducer, initialStates);

    const handlePageChange = async (pageNumber, view = states.currentView) => {
        // console.log(`[Debug] handlePageChange called for view: ${view}, pageNumber: ${pageNumber}`);
        let url = view === "profile"
            ? `/get-posts/${view}/${states.selectedUser}/${pageNumber}`
            : `/get-posts/${view}/${pageNumber}`;

        try {
            const response = await fetch(url);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
            const data = await response.json();

            dispatch({type: ACTION.SETPOSTS, posts: data.posts});
            dispatch({type: ACTION.SETPAGINATIONINFO, paginationInfo: {
                hasPrevious: data.pagination.has_previous,
                previousPageNumber: data.pagination.previous_page_number,
                pageNumber: data.pagination.page_number,
                wholePagesNumber: data.pagination.whole_pages_number,
                hasNext: data.pagination.has_next,
                nextPageNumber: data.pagination.next_page_number
            }});
        } catch (error) {
            console.error('Error fetching pagination', error);
        }
    }
    

    const handleUserClick = (user) => {
        // console.log("[Debug] handleUserClick user:", user);
       navigate(`/profile/${user}`);
    }

    const navigate = useNavigation(dispatch);

    React.useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;

            // console.log("[Debug] Path name", path);
            if(path === "/following") {
                // console.log("[Debug] setCurrentView", path);   
                dispatch({type: ACTION.SETCURRENTVIEW, currentView: "following"});
                // console.log("[Debug] Navigated to:", currentView);           
            } else if(path.startsWith("/profile")) {
                // console.log("[Debug] setCurrentView", path);
                
                const username = path.split("/")[2];
                dispatch({type: ACTION.SETSELECTEDUSER, selectedUser: username});
                dispatch({type: ACTION.SETCURRENTVIEW, currentView: "profile"});
            }
            else {
                // console.log("[Debug] setCurrentView", path);                
                dispatch({type: ACTION.SETCURRENTVIEW, currentView: "all"});
            }
        };

        // Listen for back/forward browser actions
        window.addEventListener("popstate", handlePopState);

        //Initialize current view based on the URL
        handlePopState();

        // Removes the event listener when the component unmounts to prevent memory leaks.
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);


    // Fetch logged-in user on mount
    React.useEffect(() => {
        fetchUsernameEffect(dispatch);
    }, []);

    React.useEffect(() => {
        // console.log(`[Debug] currentView changed to: ${currentView}`);
        if (states.currentView === "following" || states.currentView === "all" || states.currentView === "profile") {
            dispatch({type: ACTION.RESETPAGINATIONINFO});
            handlePageChange(1, states.currentView);
        }
    }, [states.currentView]);

    // console.log("[Debug] loggedInUser: ", loggedInUser);

    return (
        <div>
            <StatesContext.Provider value={states}>
                <DispatchContext.Provider value={dispatch}>
                {states.loggedInUser && states.currentView === "all" && <NewPost/>}
                {states.currentView === "all" && 
                    <AllPosts onUserClicked={handleUserClick} onPageChange={handlePageChange}/>}
                {states.currentView === "following" && 
                    <AllPosts onUserClicked={handleUserClick} onPageChange={handlePageChange}/>}
                {states.currentView === "profile" && states.selectedUser && <UserProfile onUserClicked={handleUserClick} user={states.selectedUser}/>}
                {states.currentView === "profile" && 
                    <AllPosts onUserClicked={handleUserClick} onPageChange={handlePageChange}/>}
                </DispatchContext.Provider>
            </StatesContext.Provider>
        </div>
    );
}


function Pagination({onPageChange}) {
    const states = useStates();
    // const currentView = React.useContext(CurrentViewContext);
    const pageNumbers = Array.from({length: states.paginationInfo.wholePagesNumber}, (_, i) => i + 1);
    // console.log("[Debug] paginationProps:", paginationProps);
    // console.log("[Debug] pageNumbers: ", pageNumbers);
    // console.log("[Debug] currentView: ", currentView);
    

    return (
        // Pagination
        <nav aria-label="...">
            <ul className="pagination">
                <li className={states.paginationInfo.hasPrevious ? "page-item" : "page-item disabled"}>
                <a  className="page-link"
                    href={`/get-posts/${states.currentView}/${states.paginationInfo.previousPageNumber}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // console.log("[Debug] Previous page clicked:", paginationProps.previousPageNumber);
                        onPageChange(states.paginationInfo.previousPageNumber, states.currentView);
                    }}
                    tabIndex={states.paginationInfo.hasPrevious ? "0" : "-1"}
                    aria-disabled={`${!states.paginationInfo.hasPrevious}`}>
                        Previous
                </a>
                </li>
                {pageNumbers.map((number) => {
                    return(
                        <li key={number} className={states.paginationInfo.pageNumber === number ? "page-item active" : "page-item"}>
                            <a  className="page-link"
                                href={`/get-posts/${states.currentView}/${number}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    // console.log("[Debug] Page number clicked:", number);
                                    onPageChange(number, states.currentView);
                                }}>
                                {number}
                                {states.paginationInfo.pageNumber === number && <span className="sr-only">(current)</span>}
                            </a>
                        </li>
                    )
                })}
                <li className={states.paginationInfo.hasNext ? "page-item" : "page-item disabled"}>
                <a  className="page-link"
                    href={`/get-posts/${states.currentView}/${states.paginationInfo.nextPageNumber}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // console.log("[Debug] Next page clicked:", paginationProps.nextPageNumber);
                        onPageChange(states.paginationInfo.nextPageNumber, states.currentView);
                    }}
                    tabIndex={states.paginationInfo.hasNext ? "0" : "-1"}
                    aria-disabled={`${!states.paginationInfo.hasNext}`}>
                    Next
                </a>
                </li>
            </ul>
        </nav>
    );
}


function NewPost() {
    const states = useStates();
    const dispatch = useStatesDispatch();
    const [content, setContent] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    function handleSubmitPost(event) {
        event.preventDefault();
        setLoading(true);

        fetch('/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                poster: states.loggedInUser,
                content: content
            }),
            credentials: 'include',        
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch('/get-posts/all')
                .then(response => response.json())
                .then(data => {
                    dispatch({type: ACTION.SETPOSTS, posts: data.posts});
                });

                setContent("");
                setLoading(false);
            });
    }

    return (
        <div className="new-post">
            <h4>New Post</h4>
            <form onSubmit={handleSubmitPost}>
                <textarea
                    className="form-control"
                    value={content}
                    onChange={(e)=>setContent(e.target.value)}
                    rows="3"
                />
                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Posting..." : "Post"}</button>
            </form>
        </div>
    );
}


function AllPosts({onEditClicked, onUserClicked, onPageChange}) {
    const states = useStates();
    
    // console.log("[Debug] All Posts");
    return (
        <div className="all-post">
            {states.posts && states.posts.map((post) => (
                <Post key={post.id} onEditClicked={onEditClicked} onUserClicked={onUserClicked} post={post}/>
            ))}
            <Pagination onPageChange={onPageChange}/>
        </div>

    )
}

function Post({onUserClicked, post}) {
    const states = useStates();
    const dispatch = useStatesDispatch();
    const [editMode, setEditMode] = React.useState(false);
    const [content, setContent] = React.useState(post.contents);

    console.log("[Debug] Post data: ", post);
    console.log("[Debug] Logged in user: ", states.loggedInUser);
    console.log("[Debug] Post data: ", post.poster);

    function handleEdit(event) {
        // console.log("[Debug] handleEdit called");
        event.preventDefault();

        fetch(`/edit-post/${post.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                content: content
            }),
            credentials: "include",
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch('/get-posts/all')
                .then(response => response.json())
                .then(data => {
                    dispatch({type: ACTION.SETPOSTS, posts: data.posts});
                });
            });

        setEditMode(!editMode);
    }

    return(
        <div className="post">
            <a href={`/profile/${post.poster}`} onClick={(e) => {
                e.preventDefault();
                // console.log("[Debug] poster clicked:", post.poster);
                onUserClicked(post.poster)
            }}>
                    <h5>{post.poster}</h5></a>
            <p className="p-grey">{post.timestamp}</p>
            {!editMode && <p>{content}</p>}
            <Like post={post}/>
            {states.loggedInUser === post.poster && editMode ? (
                <form onSubmit={handleEdit}>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)}/>
                    <button
                        className="btn btn-outline-dark save-post-btn"
                        type="submit"
                    > 
                        Save
                    </button>
                    <button
                        className="btn btn-outline-dark cancel-post-btn"
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setEditMode(false);
                            setContent(post.contents);
                        }}
                    >
                        Cancel
                    </button>
                </form>         
                )  
             :
             <button 
                className="btn btn-outline-dark edit-post-btn"
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setEditMode(!editMode);
                }}
                >
                    Edit
                </button>
            }            
        </div>
    );
}


function UserProfile({user}) {
    const states = useStates();
    const [followerNo, setFollowerNo] = React.useState(0);
    const [followingNo, setFollowingNo] = React.useState(0);
    const [isFollower, setIsFollower] = React.useState(false);

    function handleFollow() {
        fetch('/follow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
                followingUser: user,
            }),
            credentials: 'include',
        })
            .then(response => response.json())
            .then(result => {
                console.log(result.message || result.error);

                fetch(`/get-profile-info/${user}`)
                .then(response => response.json())
                .then(info => {
                    setFollowerNo(info.follower_no);
                    setFollowingNo(info.following_no);
                    setIsFollower(info.is_follower);
                })
            })

        setIsFollower(!isFollower);
    }

    React.useEffect(()=> {
        if (!user) return;

        fetch(`/get-profile-info/${user}`)
            .then(response => response.json())
            .then(info => {
                setFollowerNo(info.follower_no);
                setFollowingNo(info.following_no);
                setIsFollower(info.is_follower);
                // console.log("[Debug] isFollower: ", info.is_follower);
            })
    }, [user]);

    return (
        <div className="profile">
            <div className="profile-info">
                <h2>{user}</h2>
                <p>{followerNo} follower | {followingNo} following</p>
                {
                    states.loggedInUser !== user &&
                    <button 
                    onClick={handleFollow}
                    type="button"
                    className="btn btn-outline-dark">
                    {isFollower ? "Unfollow" : "Follow"}
                    </button>
                }
            </div>
        </div>
    );
}


function Like({post}) {
    const [liked, setLiked] = React.useState(false);
    const [likes, setLikes] = React.useState(0);
    const [loading, setLoading] = React.useState(false);


    async function fetchLikes() {
        try {
            const response = await fetch(`/like/${post.id}`);

            if (!response.ok) throw new Error("Failed to fetch likes.");
            
            const data = await response.json();

            setLiked(data.liked);
            setLikes(data.likes);
        } catch (error) {
            console.error("Error fetching likes: ", error);
        }
    }

    async function handleLike() {
        if (loading) return;

        setLoading(true);

        try {
            const response = await fetch(`/like/${post.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({
                    liked: !liked
                }),
                credentials: 'include', 
            })

            if (!response.ok) throw new Error("Faild to post data");

            await fetchLikes();
        } catch (error) {
            console.error("Error posting likes: ", error)
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        fetchLikes();
    },[post.id])

    return (
        <div className='like'>
            <span 
                className={`fa ${liked? "fa-heart" : "fa-heart-o"} ${loading ? "disabled" : ""}`}
                onClick={handleLike}
                aria-hidden="true"
                style={{cursor: loading ? "not-allowed" : "pointer"}}
                >
            </span>
            <span 
                className="badge">
                {likes}
            </span>
        </div>
    );
}


function loadPost() {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<SocialNetworkApp />);
}


// Ensure that the component only loads after the DOM is fully loaded
window.onload = function() {
    loadPost();
};


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const getCsrfToken = () => getCookie('csrftoken');

function statesReducer(states, action) {
    switch(action.type) {
        case ACTION.SETCURRENTVIEW : {
            return {
                ...states,
                currentView: action.currentView,
            };
        }
        case ACTION.SETLOGGEDINUSER: {
            return {
                ...states,
                loggedInUser: action.loggedInUser,
            };
        }
        case ACTION.SETPOSTS : {
            return {
                ...states,
                posts: action.posts,
            };
        }
        case ACTION.SETSELECTEDUSER: {
            return {
                ...states,
                selectedUser: action.selectedUser,
            };
        }
        case ACTION.SETPAGINATIONINFO: {
            return {
                ...states,
                paginationInfo: action.paginationInfo,
            };
        }
        case ACTION.RESETPAGINATIONINFO: {
            return {
                ...states,
                paginationInfo: initialStates.paginationInfo,
            }
        }
        default:{
            console.log("[Debug] action: ", action.type);
            throw Error('Unknown action: ', action.type);
        }
    }
}

function useNavigation(dispatch) {
    // console.log(`[Debug] Navigating to: ${path}`);
    return React.useCallback((path) => {
        const newView = path.startsWith("/following") ? "following" : path.startsWith("/profile") ? "profile" : "all";

        dispatch({type: ACTION.SETCURRENTVIEW, currentView: newView}); // Update state before triggering a fetch
        window.history.pushState({}, "", path);
        dispatchPopState();
    }, []);   
}

function dispatchPopState() {
    // Trigger popstate manually
    const popStateEvent = new PopStateEvent("popstate");
    dispatchEvent(popStateEvent);
}

function fetchUsernameEffect(dispatch) {
    fetch('/get-username')
            .then(response => response.json())
            .then(data => {
                dispatch({type: ACTION.SETLOGGEDINUSER, loggedInUser: data.username});
            })
            .catch(error => console.error("Error fetching username:", error));
}

function useStates() {
    return React.useContext(StatesContext);
}

function useStatesDispatch() {
    return React.useContext(DispatchContext);
}

const initialStates = {
    currentView: "all",
    loggedInUser: "",
    posts: [],
    selectedUser: null,
    paginationInfo: {
        hasPrevious: false,
        previousPageNumber: null,
        pageNumber: 1,
        wholePagesNumber: 1,
        hasNext: false,
        nextPageNumber: null
    }
};
import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeContext } from "../App";
import Button from "../components/ui/Button";
import Background from "../components/layout/Background";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

function Home() {
  const { isDarkMode } = useContext(ThemeContext);
  const headerRef = useRef(null);
  const roofRef = useRef(null);

  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isRoofVisible, setIsRoofVisible] = useState(false);
  const [content, setContent] = useState({
    quotes: [],
    currentWorkout: { description: "", warmup: [], main: [] },
    scheduledWorkouts: [],
    aboutUs: "",
    dailyChallenges: [],
    lastUpdated: null,
  });
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [latestBlogPost, setLatestBlogPost] = useState(null);
  const [completedChallenges, setCompletedChallenges] = useState(
    () => JSON.parse(localStorage.getItem("completedChallenges")) || []
  );

  useEffect(() => {
    const fetchAndUpdateContent = async () => {
      const docRef = doc(db, "content", "home");
      const docSnap = await getDoc(docRef);

      let newContent = {
        quotes: [
          "An athlete won't judge you for working out.",
          "A millionaire won't judge you for starting a business.",
          "A musician won't judge you for trying to sing a song.",
          "It's always the people going nowhere that have something to say.",
          "Idle hands do the devil's work",
        ],
        currentWorkout: {
          description:
            "A quick 20-minute routine to kickstart your metabolism and improve digestion.",
          warmup: ["5-minute brisk walk or jog", "3 sets of 15 squats"],
          main: [
            "3 sets of 10 push-ups",
            "2 sets of 20 jumping jacks",
            "1-minute plank hold",
          ],
        },
        scheduledWorkouts: [],
        aboutUs:
          "We are dedicated to bringing you information about Australian Shepherds and how to maintain a healthy gut. Our mission is to educate and inspire a natural approach to wellness for you and your furry friends.",
        dailyChallenges: [
          "Drink 8 glasses of water.",
          "Take a 10-minute digestion-boosting walk with your Aussie.",
          "Try a gut-friendly snack like yogurt or pumpkin.",
        ],
        lastUpdated: null,
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        newContent = {
          ...newContent,
          ...data,
          currentWorkout: {
            ...newContent.currentWorkout,
            ...data.currentWorkout,
            warmup:
              data.currentWorkout?.warmup || newContent.currentWorkout.warmup,
            main: data.currentWorkout?.main || newContent.currentWorkout.main,
          },
          scheduledWorkouts: data.scheduledWorkouts || [],
          dailyChallenges: data.dailyChallenges || newContent.dailyChallenges,
        };
      }

      const now = new Date();
      const updatedScheduledWorkouts = [...newContent.scheduledWorkouts];
      let shouldUpdate = false;

      updatedScheduledWorkouts.sort(
        (a, b) => new Date(a.updateDateTime) - new Date(b.updateDateTime)
      );

      if (updatedScheduledWorkouts.length > 0) {
        const nextWorkout = updatedScheduledWorkouts[0];
        const nextUpdateTime = new Date(nextWorkout.updateDateTime);
        if (
          now >= nextUpdateTime &&
          (!newContent.lastUpdated ||
            new Date(newContent.lastUpdated) < nextUpdateTime)
        ) {
          newContent.currentWorkout = {
            description: nextWorkout.description || "",
            warmup: nextWorkout.warmup || [],
            main: nextWorkout.main || [],
          };
          updatedScheduledWorkouts.shift();
          newContent.scheduledWorkouts = updatedScheduledWorkouts;
          newContent.lastUpdated = now.toISOString();
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await setDoc(docRef, newContent, { merge: true });
      }

      setContent(newContent);

      const blogCollectionRef = collection(db, "content", "blog", "posts");
      const blogSnapshot = await getDocs(blogCollectionRef);
      const blogPosts = blogSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (blogPosts.length > 0) {
        blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestPost = blogPosts[0];
        const excerpt =
          latestPost.content.split(" ").slice(0, 30).join(" ") + "...";
        setLatestBlogPost({ ...latestPost, excerpt });
      }
    };

    fetchAndUpdateContent();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          if (entry.target === headerRef.current) setIsHeaderVisible(isVisible);
          if (entry.target === roofRef.current) setIsRoofVisible(isVisible);
        });
      },
      { threshold: 0.2 }
    );

    if (headerRef.current) observer.observe(headerRef.current);
    if (roofRef.current) observer.observe(roofRef.current);

    return () => {
      if (headerRef.current) observer.unobserve(headerRef.current);
      if (roofRef.current) observer.unobserve(roofRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex(
        (prevIndex) => (prevIndex + 1) % content.quotes.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [content.quotes.length]);

  useEffect(() => {
    localStorage.setItem(
      "completedChallenges",
      JSON.stringify(completedChallenges)
    );
  }, [completedChallenges]);

  const quoteVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } },
  };

  const messageVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: { duration: 0.5, ease: "easeIn" },
    },
  };

  const toggleChallenge = (index) => {
    setCompletedChallenges((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const allChallengesCompleted =
    content.dailyChallenges.length > 0 &&
    completedChallenges.length === content.dailyChallenges.length &&
    content.dailyChallenges.every((_, index) =>
      completedChallenges.includes(index)
    );

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDarkMode ? "bg-stone-900" : "bg-white"
      }`}
    >
      <section
        ref={headerRef}
        className={`py-20 px-6 ${isDarkMode ? "bg-stone-900" : "bg-white"}`}
      >
        <div className="container mx-auto text-center">
          <h1
            className={`text-5xl md:text-6xl font-extrabold mb-4 transition-colors duration-300 ease-in-out ${
              isDarkMode ? "text-red-400" : "text-red-800"
            }`}
          >
            Welcome to Aussie Gut Pack
          </h1>
          <p
            className={`text-2xl max-w-2xl mx-auto mb-8 transition-colors duration-300 ease-in-out ${
              isDarkMode ? "text-white" : "text-red-600"
            }`}
          >
            Empowering Your Digestive Health, Naturally.
          </p>
          <div
            className={`flex flex-col md:flex-row gap-6 transition-all duration-700 ease-in-out ${
              isHeaderVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <div className="md:w-1/2 p-6 flex flex-col justify-center">
              <h2
                className={`text-3xl font-bold mb-4 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-red-400" : "text-red-800"
                }`}
              >
                About Us
              </h2>
              <p
                className={`text-lg transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-white" : "text-red-600"
                }`}
              >
                {content.aboutUs}
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  to="/fitness-tips"
                  variant="primary"
                  className={`${
                    isDarkMode
                      ? "bg-red-800 text-white hover:bg-red-900"
                      : "bg-red-800 text-white hover:bg-red-900"
                  }`}
                >
                  Learn More
                </Button>
                <Button
                  to="/signup"
                  variant="primary"
                  className={`${
                    isDarkMode
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-700 text-white hover:bg-red-800"
                  }`}
                >
                  Join the Pack
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="h-80 w-80 md:h-[400px] md:w-[400px] overflow-hidden relative rounded-full">
                <Background className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr
        className={`my-12 ${
          isDarkMode ? "border-stone-700" : "border-stone-300"
        }`}
      />

      <section
        ref={roofRef}
        className={`py-20 px-6 ${isDarkMode ? "bg-stone-900" : "bg-white"}`}
      >
        <div
          className={`container mx-auto text-center transition-all duration-700 ease-in-out ${
            isRoofVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <h2
            className={`text-3xl font-bold mb-8 transition-colors duration-300 ease-in-out ${
              isDarkMode ? "text-red-400" : "text-red-800"
            }`}
          >
            Wisdom to Win The Day
          </h2>
          <div className="max-w-2xl mx-auto mb-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentQuoteIndex}
                variants={quoteVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`text-xl italic transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-white" : "text-red-600"
                }`}
              >
                "{content.quotes[currentQuoteIndex]}"
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Two-column layout for Workout and Challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Workout of the Day */}
            <div>
              <h3
                className={`text-2xl font-semibold mb-4 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-red-400" : "text-red-800"
                }`}
              >
                Workout of the Day
              </h3>
              <p
                className={`text-lg mb-6 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-white" : "text-red-600"
                }`}
              >
                {content.currentWorkout.description}
              </p>
              <h4
                className={`text-xl font-semibold mb-3 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-red-400" : "text-red-800"
                }`}
              >
                Warm Up
              </h4>
              <ul
                className={`text-left list-disc pl-6 mb-6 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-blue-300" : "text-blue-600"
                }`}
              >
                {(content.currentWorkout.warmup || []).map(
                  (exercise, index) => (
                    <li key={`warmup-${index}`} className="mb-2 text-lg">
                      {exercise}
                    </li>
                  )
                )}
              </ul>
              <h4
                className={`text-xl font-semibold mb-3 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-red-400" : "text-red-800"
                }`}
              >
                Main Workout
              </h4>
              <ul
                className={`text-left list-disc pl-6 mb-8 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-white" : "text-red-600"
                }`}
              >
                {(content.currentWorkout.main || []).map((exercise, index) => (
                  <li key={`main-${index}`} className="mb-2 text-lg">
                    {exercise}
                  </li>
                ))}
              </ul>
              <Button
                to="/fitness-tips"
                variant="primary"
                className={`mx-auto ${
                  isDarkMode
                    ? "bg-red-800 text-white hover:bg-red-900"
                    : "bg-red-800 text-white hover:bg-red-900"
                }`}
              >
                More Fitness Tips
              </Button>
            </div>

            {/* Daily Gut Health Challenges */}
            <div>
              <h3
                className={`text-2xl font-semibold mb-4 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-red-400" : "text-red-800"
                }`}
              >
                Daily Gut Health Challenges
              </h3>
              <ul
                className={`text-left list-disc pl-6 mb-4 transition-colors duration-300 ease-in-out ${
                  isDarkMode ? "text-white" : "text-red-600"
                }`}
              >
                {(content.dailyChallenges || []).map((challenge, index) => (
                  <li
                    key={`challenge-${index}`}
                    className="mb-2 text-lg flex items-center"
                  >
                    <input
                      type="checkbox"
                      checked={completedChallenges.includes(index)}
                      onChange={() => toggleChallenge(index)}
                      className="mr-2"
                    />
                    {challenge}
                  </li>
                ))}
              </ul>
              <AnimatePresence>
                {allChallengesCompleted && (
                  <motion.p
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`text-lg font-semibold transition-colors duration-300 ease-in-out ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    Great job, Pack Leader!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <hr
        className={`my-12 ${
          isDarkMode ? "border-stone-700" : "border-stone-300"
        }`}
      />

      {latestBlogPost && (
        <section
          className={`py-20 px-6 ${isDarkMode ? "bg-stone-900" : "bg-white"}`}
        >
          <div className="container mx-auto text-center">
            <h2
              className={`text-3xl font-bold mb-4 transition-colors duration-300 ease-in-out ${
                isDarkMode ? "text-red-400" : "text-red-800"
              }`}
            >
              Latest From Our Blog
            </h2>
            <h3
              className={`text-xl font-semibold mb-2 transition-colors duration-300 ease-in-out ${
                isDarkMode ? "text-white" : "text-red-600"
              }`}
            >
              {latestBlogPost.title}
            </h3>
            <p
              className={`text-sm mb-4 transition-colors duration-300 ease-in-out ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {latestBlogPost.date}
            </p>
            <p
              className={`text-lg mb-6 max-w-2xl mx-auto transition-colors duration-300 ease-in-out ${
                isDarkMode ? "text-white" : "text-red-600"
              }`}
            >
              {latestBlogPost.excerpt}
            </p>
            <Button
              to={`/blog/${latestBlogPost.id}`}
              variant="primary"
              className={`mx-auto ${
                isDarkMode
                  ? "bg-red-800 text-white hover:bg-red-900"
                  : "bg-red-800 text-white hover:bg-red-900"
              }`}
            >
              Read More
            </Button>
          </div>
        </section>
      )}

      <hr
        className={`my-12 ${
          isDarkMode ? "border-stone-700" : "border-stone-300"
        }`}
      />

      <div
        className={`py-8 ${
          isDarkMode ? "bg-stone-800" : "bg-stone-100"
        } text-center`}
      >
        <p
          className={`text-lg mb-4 ${
            isDarkMode ? "text-white" : "text-red-600"
          }`}
        >
          Want more? Check out our full library of fitness tips!
        </p>
        <Button
          to="/fitness-tips"
          variant="primary"
          className={`${
            isDarkMode
              ? "bg-red-800 text-white hover:bg-red-900"
              : "bg-red-800 text-white hover:bg-red-900"
          }`}
        >
          Explore Now
        </Button>
      </div>
    </div>
  );
}

export default Home;

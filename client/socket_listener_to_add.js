// Add this code to AttemptQuiz.jsx after line 140 (inside the useEffect, after the new_question_added listener)

// Listen for intermediate leaderboard after each question
socket.on('question_leaderboard', ({ questionIndex, leaderboard }) => {
    console.log('Leaderboard received for question', questionIndex, leaderboard);
    setCurrentLeaderboard(leaderboard);
});

// Update the return statement to clean up both listeners:
return () => {
    socket.off('new_question_added');
    socket.off('question_leaderboard');
};

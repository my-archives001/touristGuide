import React, { useState, useEffect, useRef } from 'react';

const TypingEffect = ({ text, speed = 40, onComplete }) => {
  // State to hold currently displayed substring of the full text
  const [displayed, setDisplayed] = useState('');
  // Use ref to avoid onComplete causing re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let i = 0;
    setDisplayed(''); // Clear displayed text on new input

    // Set interval timer to append characters one by one
    const timer = setInterval(() => {
      if (i >= text.length) {
        // Stop timer and invoke onComplete callback when done
        clearInterval(timer);
        if (onCompleteRef.current) onCompleteRef.current();
        return;
      }

      const char = text[i];
      if (char !== undefined) {
        // Append next character to displayed text
        setDisplayed((prev) => prev + char);
      }
      i++;
    }, speed);

    // Cleanup interval timer on component unmount or when dependencies change
    return () => clearInterval(timer);
  }, [text, speed]); // onComplete removed — using ref instead

  return (
    <p
        style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            fontFamily: 'monospace',
            fontSize: '1.02rem',
            textAlign: 'center'
        }}
    >
      {displayed}
    </p>
  );
};

export default TypingEffect;
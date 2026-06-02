import React from "react";

const Page = React.forwardRef(({ children }, ref) => {
  return (
    <div
      ref={ref}
      className="page w-full h-full bg-white relative overflow-hidden"
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,0.08), inset 10px 0 18px rgba(0,0,0,0.08)"
      }}
    >
      <div
        className="absolute top-0 right-0 w-6 h-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.18), transparent)"
        }}
      />

      <div
        className="absolute top-0 left-0 w-6 h-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.06), transparent)"
        }}
      />

      {children}
    </div>
  );
});

Page.displayName = "Page";

export default Page;
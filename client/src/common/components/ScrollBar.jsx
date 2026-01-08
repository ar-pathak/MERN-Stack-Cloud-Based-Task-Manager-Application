import React from 'react'

const ScrollBar = () => {
    return (
        <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #475569 transparent;
                }
            `}</style>

    )
}

export default ScrollBar
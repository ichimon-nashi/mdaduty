import pdfTemplate from '../assets/rawPDF.pdf';
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import tcfont from "../assets/tcfont.ttf"
import Navbar from './Navbar';
import { dataRoster, approvedUsers } from "../component/DataRoster.js";

const DutyChange = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstID: "",
        firstName: "",
        firstRank: "",
        firstDate: "",
        firstTask: "",
        secondID: "",
        secondName: "",
        secondRank: "",
        secondDate: "",
        secondTask: "",
        applicationDate: new Date().toISOString().slice(0, 10) // Today's date in YYYY-MM-DD format
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userSchedule, setUserSchedule] = useState(null);

    // Mock user schedule data - in a real app this would come from an API or props
    const mockUserSchedule = {
        "2025-05-01": "",
        "2025-05-02": "I4",
        "2025-05-03": "休",
        "2025-05-04": "SA",
        "2025-05-05": "I2",
        "2025-05-06": "課",
        "2025-05-07": "例",
        "2025-05-08": "I2",
        "2025-05-09": "SA",
        "2025-05-10": "休",
        "2025-05-11": "A/L",
        "2025-05-12": "A/L",
        "2025-05-13": "A/L",
        "2025-05-14": "A/L",
        "2025-05-15": "例",
        "2025-05-16": "休",
        "2025-05-17": "M2",
        "2025-05-18": "I2",
        "2025-05-19": "I4",
        "2025-05-20": "G",
        "2025-05-21": "G",
        "2025-05-22": "課",
        "2025-05-23": "課",
        "2025-05-24": "M2",
        "2025-05-25": "I2",
        "2025-05-26": "例",
        "2025-05-27": "I4",
        "2025-05-28": "H4",
        "2025-05-29": "M4",
        "2025-05-30": "V4",
        "2025-05-31": "休",
    };

    // Helper function to find crew member details and their rank
    const findCrewMemberRank = (employeeID) => {
        // First check approvedUsers
        const approvedUser = approvedUsers.find(user => user.id === employeeID);
        if (approvedUser) {
            return approvedUser.rank;
        }
        
        // Then check crew schedules
        const crewMember = dataRoster.crew_schedules.find(
            schedule => schedule.employeeID === employeeID
        );
        return crewMember?.rank || "";
    };

    // Load data from location state if available
    useEffect(() => {
        if (location.state) {
            // Look up ranks for both people
            const firstRank = findCrewMemberRank(location.state.firstID || "");
            const secondRank = findCrewMemberRank(location.state.secondID || "");
            
            // Set form data from location state
            setFormData(prevState => ({
                ...prevState,
                ...location.state,
                firstRank,
                secondRank
            }));
        }
        
        // Set the user schedule data
        setUserSchedule(mockUserSchedule);
    }, [location.state]);

    // Helper function to download Uint8Array as a file
    function download(bytes, filename, contentType) {
        const blob = new Blob([bytes], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    async function modifyPdf() {
        setIsLoading(true);
        setError(null);
        
        try {
            // Use the imported PDF template
            const existingPdfBytes = await fetch(pdfTemplate).then(res => {
                if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}`);
                return res.arrayBuffer();
            });

            // Load the custom font
            const fontBytes = await fetch(tcfont).then(res => res.arrayBuffer());

            // Load a PDFDocument from the existing PDF bytes with specific options to reduce size
            const pdfDoc = await PDFDocument.load(existingPdfBytes, {
                // Set updateMetadata to false to prevent adding new metadata
                updateMetadata: false
            });
            
            pdfDoc.registerFontkit(fontkit);

            // Embed only a subset of the font to reduce size
            const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

            // Get the first page of the document
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            // Function to draw text without color specification (uses default black)
            const drawTextOptimized = (text, x, y, size = 14) => {
                firstPage.drawText(text || "", {
                    x, y, size, font: customFont 
                    // Removed color parameter to use default
                });
            };

            // First Person Information
            drawTextOptimized(formData.firstID, 70, 705);
            drawTextOptimized(formData.firstName, 195, 705);
            
            // Draw "X" for first rank
            if (formData.firstRank) {
                if (formData.firstRank === 'PR' || formData.firstRank === 'FI') {
                    drawTextOptimized("X", 150, 678, 16);
                } else if (formData.firstRank === 'LF') {
                    drawTextOptimized("X", 150, 656, 16);
                } else if (formData.firstRank === 'FS' || formData.firstRank === 'FA') {
                    drawTextOptimized("X", 150, 635, 16);
                }
            }
            
            // Determine if firstDate is a single date or multiple dates
            const isFirstDateMultiple = formData.firstDate && formData.firstDate.includes('-');
            const firstDateX = isFirstDateMultiple ? 43 : 70;
            const firstTaskX = isFirstDateMultiple ? 142 : 210;
            
            drawTextOptimized(formData.firstDate, firstDateX, 566);
            
            // Make sure empty duties are displayed as "空"
            const firstTask = formData.firstTask === "" ? "空" : formData.firstTask;
            drawTextOptimized(firstTask, firstTaskX, 566);

            // Second Person Information
            drawTextOptimized(formData.secondID, 330, 705);
            drawTextOptimized(formData.secondName, 450, 705);
            
            // Draw "X" for second rank
            if (formData.secondRank) {
                if (formData.secondRank === 'PR' || formData.secondRank === 'FI') {
                    drawTextOptimized("X", 407, 678, 16);
                } else if (formData.secondRank === 'LF') {
                    drawTextOptimized("X", 407, 656, 16);
                } else if (formData.secondRank === 'FS' || formData.secondRank === 'FA') {
                    drawTextOptimized("X", 407, 635, 16);
                }
            }
            
            // Determine if secondDate is a single date or multiple dates
            const isSecondDateMultiple = formData.secondDate && formData.secondDate.includes('-');
            const secondDateX = isSecondDateMultiple ? 300 : 328;
            const secondTaskX = isSecondDateMultiple ? 400 : 465;
            
            drawTextOptimized(formData.secondDate, secondDateX, 566);
            
            // Make sure empty duties are displayed as "空"
            const secondTask = formData.secondTask === "" ? "空" : formData.secondTask;
            drawTextOptimized(secondTask, secondTaskX, 566);

            // Format the application date
            const formattedDate = new Date(formData.applicationDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
            
            // Application Date
            drawTextOptimized(formattedDate, 180, 457);

            // Serialize the PDFDocument to bytes with compression options
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: true,  // Enable object streams for smaller files
                addDefaultPage: false,   // Don't add a default page
                useCompression: true     // Use compression
            });

            // Create a filename with the people's names
            const filename = `FMEF-06-04客艙組員任務互換申請單-${formData.firstName}&${formData.secondName}.pdf`;

            // Trigger download
            download(pdfBytes, filename, "application/pdf");
            
        } catch (error) {
            console.error('Error modifying PDF:', error);
            setError(`Failed to generate PDF: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
        
        // If changing secondID, try to find their rank
        if (name === 'secondID') {
            const secondRank = findCrewMemberRank(value);
            if (secondRank) {
                setFormData(prevFormData => ({
                    ...prevFormData,
                    secondRank,
                }));
            }
            
            // Also try to find secondName from DataRoster if available
            const crewMember = dataRoster.crew_schedules.find(
                schedule => schedule.employeeID === value
            );
            if (crewMember && crewMember.name) {
                setFormData(prevFormData => ({
                    ...prevFormData,
                    secondName: crewMember.name,
                }));
            }
        }
    };

    return (
        <div className="min-h-screen">
            {/* Use the Navbar component */}
            <Navbar 
                userDetails={{name: formData.firstName}} 
                title="豪神任務互換APP"
            />

            <div className="w-full py-8 px-4">
                <div className="dutyChange-container max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold mb-8 text-center">客艙組員任務互換申請單</h1>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="md:border-r md:pr-8">
                            <h2 className="text-xl font-semibold mb-4">甲方資料</h2>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">員工編號</label>
                                <input
                                    type="text"
                                    name="firstID"
                                    placeholder="員工編號"
                                    value={formData.firstID}
                                    className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    placeholder="姓名"
                                    value={formData.firstName}
                                    className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">職位</label>
                                <input
                                    type="text"
                                    name="firstRank"
                                    placeholder="職位"
                                    value={formData.firstRank}
                                    className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                                <input
                                    type="text"
                                    name="firstDate"
                                    placeholder="日期 (MM/DD)"
                                    value={formData.firstDate}
                                    className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">任務</label>
                                <input
                                    type="text"
                                    name="firstTask"
                                    placeholder="任務內容"
                                    value={formData.firstTask}
                                    className="w-full p-3 border rounded bg-gray-100 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                        </div>
                        
                        <div className="md:pl-8">
                            <h2 className="text-xl font-semibold mb-4">乙方資料</h2>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">員工編號</label>
                                <input
                                    type="text"
                                    name="secondID"
                                    placeholder="員工編號"
                                    value={formData.secondID}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                                <input
                                    type="text"
                                    name="secondName"
                                    placeholder="姓名"
                                    value={formData.secondName}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">職位</label>
                                <input
                                    type="text"
                                    name="secondRank"
                                    placeholder="職位"
                                    value={formData.secondRank}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                                <input
                                    type="text"
                                    name="secondDate"
                                    placeholder="日期 (MM/DD)"
                                    value={formData.secondDate}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">任務</label>
                                <input
                                    type="text"
                                    name="secondTask"
                                    placeholder="任務內容"
                                    value={formData.secondTask}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">申請日期</label>
                        <input
                            type="date"
                            name="applicationDate"
                            value={formData.applicationDate}
                            disabled
                            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="flex justify-center space-x-6">
                        <button
                            onClick={modifyPdf}
                            disabled={isLoading}
                            className="generateButton px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 text-lg font-medium"
                        >
                            {isLoading ? "處理中..." : "產生換班單 PDF"}
                        </button>
                        <button
                            onClick={() => navigate('/mdaduty')}
                            className="returnButton px-8 py-4 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-lg font-medium"
                        >
                            返回班表
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DutyChange;
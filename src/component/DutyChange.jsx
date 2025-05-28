import pdfTemplate from '../assets/rawPDF.pdf';
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import tcfont from "../assets/tcfont.ttf"
import Navbar from './Navbar';
import { dataRoster, approvedUsers } from "../component/DataRoster.js";

// PDF Positions:
// 甲方員編:(62,700) 
// 甲方姓名:(180,700) 
// 甲方資格(PR):(147,678) 
// 甲方資格(LF):(147,656) 
// 甲方資格(FA):(147,635) 
// 甲方日期_1:(42,565) 
// 甲方任務_1:(142,565) 
// 甲方日期_2:(42,546) 
// 甲方任務_2:(142,546) 
// 甲方日期_3:(42,528) 
// 甲方任務_3:(142,528) 
// 乙方日期_1:(298,565) 
// 乙方任務_1:(398,565) 
// 乙方日期_2:(299,546) 
// 乙方任務_2:(398,546) 
// 乙方日期_3:(298,528) 
// 乙方任務_3:(398,528) 
// 乙方員編:(320,700) 
// 乙方姓名:(438,700) 
// 乙方資格(PR):(404,678) 
// 乙方資格(LF):(404,656) 
// 乙方資格(FA):(404,635) 
// 提出申請日期:(165, 454)

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
        applicationDate: new Date().toISOString().slice(0, 10), // Today's date in YYYY-MM-DD format
        selectedMonth: "",
        allDuties: [] // Store all individual duties for multi-line PDF generation
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userSchedule, setUserSchedule] = useState(null);

    // Mock user schedule data - in a real app this would come from an API or props
    const mockUserSchedule = {
        days: {
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
        }
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

    // Helper function to group consecutive duties for PDF display
    const groupConsecutiveDuties = (duties) => {
        if (!duties || duties.length === 0) return [];
        
        // Sort duties by date first
        const sortedDuties = [...duties].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const groups = [];
        let currentGroup = [sortedDuties[0]];
        
        for (let i = 1; i < sortedDuties.length; i++) {
            const currentDate = new Date(sortedDuties[i].date);
            const previousDate = new Date(sortedDuties[i - 1].date);
            const daysDiff = (currentDate - previousDate) / (1000 * 60 * 60 * 24);
            
            // Check if dates are consecutive (1 day apart)
            if (daysDiff === 1) {
                currentGroup.push(sortedDuties[i]);
            } else {
                // Start new group if there's a gap in dates
                groups.push(currentGroup);
                currentGroup = [sortedDuties[i]];
            }
        }
        
        // Don't forget the last group
        groups.push(currentGroup);
        
        return groups;
    };

    // Helper function to format grouped duties for PDF
    const formatGroupedDuties = (dutyGroups, isUserDuties = false) => {
        const formattedEntries = [];
        
        dutyGroups.forEach(group => {
            if (group.length === 1) {
                // Single duty
                const duty = group[0];
                const formattedDate = formatDateForForm(duty.date);
                let task;
                
                if (isUserDuties) {
                    const userDuty = userSchedule?.days?.[duty.date] || "";
                    task = userDuty === "" ? "空" : userDuty;
                } else {
                    task = duty.duty === "" ? "空" : duty.duty;
                }
                
                formattedEntries.push({
                    date: formattedDate,
                    task: task,
                    isRange: false
                });
            } else {
                // Multiple consecutive duties
                const startDate = formatDateForForm(group[0].date);
                const endDate = formatDateForForm(group[group.length - 1].date);
                const dateRange = `${startDate} - ${endDate}`;
                
                let tasks;
                if (isUserDuties) {
                    tasks = group.map(duty => {
                        const userDuty = userSchedule?.days?.[duty.date] || "";
                        return userDuty === "" ? "空" : userDuty;
                    });
                } else {
                    tasks = group.map(duty => duty.duty === "" ? "空" : duty.duty);
                }
                
                // If more than 5 duties, split them across lines
                if (tasks.length > 5) {
                    // First line with first 5 duties + "、"
                    formattedEntries.push({
                        date: dateRange,
                        task: tasks.slice(0, 5).join('、') + '、',
                        isRange: true,
                        isContinued: true
                    });
                    
                    // Remaining duties on next line (no date, just tasks)
                    formattedEntries.push({
                        date: '',
                        task: tasks.slice(5).join('、'),
                        isRange: false,
                        isContinuation: true
                    });
                } else {
                    formattedEntries.push({
                        date: dateRange,
                        task: tasks.join('、'),
                        isRange: true
                    });
                }
            }
        });
        
        return formattedEntries;
    };

    // Helper function to break down duties into entries for PDF
    const prepareDutiesForPDF = (duties) => {
        if (!duties || duties.length === 0) return [];
        
        const dutyGroups = groupConsecutiveDuties(duties);
        return formatGroupedDuties(dutyGroups, false);
    };

    // Helper function to get user's duties for PDF
    const getUserDutiesForPDF = (selectedDates) => {
        if (!selectedDates || selectedDates.length === 0) return [];
        
        // Convert dates to duty objects for grouping
        const userDuties = selectedDates.map(date => ({ date, duty: userSchedule?.days?.[date] || "" }));
        const dutyGroups = groupConsecutiveDuties(userDuties);
        return formatGroupedDuties(dutyGroups, true);
    };

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
            
            // Handle multiple duties for first person (甲方)
            if (formData.allDuties && formData.allDuties.length > 0) {
                // Get user duties corresponding to selected dates
                const selectedDates = formData.allDuties.map(duty => duty.date);
                const userDutiesEntries = getUserDutiesForPDF(selectedDates);
                
                // Draw grouped date/duty pairs
                const yPositions = [566, 546, 528]; // Available Y positions for duties
                
                for (let i = 0; i < Math.min(userDutiesEntries.length, 3); i++) {
                    const entry = userDutiesEntries[i];
                    
                    if (entry.isContinuation) {
                        // This is a continuation line (no date, just tasks)
                        drawTextOptimized(entry.task, 142, yPositions[i]);
                    } else {
                        // Determine X positions based on whether it's a date range or single date
                        const isDateRange = entry.isRange || entry.date.includes(' - ');
                        const dateX = isDateRange ? 43 : 70;
                        const taskX = isDateRange ? 142 : 210;
                        
                        drawTextOptimized(entry.date, dateX, yPositions[i]);
                        drawTextOptimized(entry.task, taskX, yPositions[i]);
                    }
                }
            } else {
                // Fallback to original single entry format
                const isFirstDateMultiple = formData.firstDate && formData.firstDate.includes('-');
                const firstDateX = isFirstDateMultiple ? 43 : 70;
                const firstTaskX = isFirstDateMultiple ? 142 : 210;
                
                drawTextOptimized(formData.firstDate, firstDateX, 566);
                
                const firstTask = formData.firstTask === "" ? "空" : formData.firstTask;
                drawTextOptimized(firstTask, firstTaskX, 566);
            }

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
            
            // Handle multiple duties for second person (乙方)
            if (formData.allDuties && formData.allDuties.length > 0) {
                const secondDutiesEntries = prepareDutiesForPDF(formData.allDuties);
                
                // Draw grouped date/duty pairs
                const yPositions = [566, 546, 528]; // Available Y positions for duties
                
                for (let i = 0; i < Math.min(secondDutiesEntries.length, 3); i++) {
                    const entry = secondDutiesEntries[i];
                    
                    if (entry.isContinuation) {
                        // This is a continuation line (no date, just tasks) - always use left alignment
                        drawTextOptimized(entry.task, 398, yPositions[i]);
                    } else {
                        // Determine X positions based on whether it's a date range or single date
                        const isDateRange = entry.isRange || entry.date.includes(' - ');
                        const dateX = isDateRange ? 298 : 328;
                        const taskX = isDateRange ? 398 : 465;
                        
                        drawTextOptimized(entry.date, dateX, yPositions[i]);
                        drawTextOptimized(entry.task, taskX, yPositions[i]);
                    }
                }
            } else {
                // Fallback to original single entry format
                const isSecondDateMultiple = formData.secondDate && formData.secondDate.includes('-');
                const secondDateX = isSecondDateMultiple ? 298 : 328;
                const secondTaskX = isSecondDateMultiple ? 398 : 465;
                
                drawTextOptimized(formData.secondDate, secondDateX, 566);
                
                const secondTask = formData.secondTask === "" ? "空" : formData.secondTask;
                drawTextOptimized(secondTask, secondTaskX, 566);
            }

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
                useObjectStreams: true,
                addDefaultPage: false,
                useCompression: true
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

    // Helper to format date for the form (YYYY-MM-DD to MM/DD)
    const formatDateForForm = (dateStr) => {
        const date = new Date(dateStr);
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen">
            {/* Use the Navbar component */}
            <Navbar 
                userDetails={{name: formData.firstName}} 
                title="豪神任務互換APP"
            />

            <div className="confirmWindow">
                <div className="dutyChange-container">
                    <h1 className="confirmTitle">客艙組員任務互換申請單</h1>
                    
                    {error && (
                        <div className="error-container">
                            {error}
                        </div>
                    )}
                    
                    <div className="form-grid">
                        <div className="form-section">
                            <h2 className="section-title">甲方資料</h2>
                            <div className="form-group">
                                <label className="form-label">員工編號</label>
                                <input
                                    type="text"
                                    name="firstID"
                                    placeholder="員工編號"
                                    value={formData.firstID}
                                    className="form-input disabled"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">姓名</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    placeholder="姓名"
                                    value={formData.firstName}
                                    className="form-input disabled"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">職位</label>
                                <input
                                    type="text"
                                    name="firstRank"
                                    placeholder="職位"
                                    value={formData.firstRank}
                                    className="form-input disabled"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">日期</label>
                                <input
                                    type="text"
                                    name="firstDate"
                                    placeholder="日期 (MM/DD)"
                                    value={formData.firstDate}
                                    className="form-input disabled"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">任務</label>
                                <input
                                    type="text"
                                    name="firstTask"
                                    placeholder="任務內容"
                                    value={formData.firstTask}
                                    className="form-input disabled"
                                    disabled
                                />
                            </div>
                        </div>
                        
                        <div className="form-section">
                            <h2 className="section-title">乙方資料</h2>
                            <div className="form-group">
                                <label className="form-label">員工編號</label>
                                <input
                                    type="text"
                                    name="secondID"
                                    placeholder="員工編號"
                                    value={formData.secondID}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">姓名</label>
                                <input
                                    type="text"
                                    name="secondName"
                                    placeholder="姓名"
                                    value={formData.secondName}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">職位</label>
                                <input
                                    type="text"
                                    name="secondRank"
                                    placeholder="職位"
                                    value={formData.secondRank}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">日期</label>
                                <input
                                    type="text"
                                    name="secondDate"
                                    placeholder="日期 (MM/DD)"
                                    value={formData.secondDate}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">任務</label>
                                <input
                                    type="text"
                                    name="secondTask"
                                    placeholder="任務內容"
                                    value={formData.secondTask}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="form-group date-group">
                        <label className="form-label">申請日期</label>
                        <input
                            type="date"
                            name="applicationDate"
                            value={formData.applicationDate}
                            disabled
                            className="form-input disabled date-input"
                        />
                    </div>
                    
                    <div className="confirmButton-container">
                        <button
                            onClick={modifyPdf}
                            disabled={isLoading}
                            className="generateButton"
                        >
                            {isLoading ? "處理中..." : "產生換班單 PDF"}
                        </button>
                        <button
                            onClick={() => navigate('/mdaduty')}
                            className="returnButton"
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
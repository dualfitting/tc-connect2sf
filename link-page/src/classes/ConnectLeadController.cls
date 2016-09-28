public with sharing class ConnectLeadController {

    public String connectLeadId { get; set; }

    public PageReference findLead() {
        connectLeadId = ApexPages.currentPage().getParameters().get('connectProjectId');
        
        if(!String.isBlank(connectLeadId)){
            //fetch the lead and return the url
            List<Lead> l =[Select Id FROM Lead WHERE Connect_Project_Id__c=:connectLeadId LIMIT 1];
            if(l.size()>0)
                return new PageReference('/'+l[0].Id);
        }
        
        return null;      
    }
    
    

}
@IsTest
public class ConnectLeadControllerTest{

        static void setup(){
                
             Lead l= new Lead(LastName='Test',Email='t@t.com',Company='Test',Connect_Project_Id__c='1234');
             insert l;        
        }
        
        static testmethod void testFindLeadTrue(){
             setup();
             
             Test.startTest();
                 system.Test.setCurrentPage(new PageReference('/ConnectLead'));                
                 System.currentPageReference().getParameters().put('connectProjectId', '1234');
                 
                 ConnectLeadController ctrl=new ConnectLeadController();
                 Pagereference p = ctrl.findLead();
                 
                 system.assert(p!=null);
                 
             Test.stoptest();  
        }
          
        static testmethod void testFindLeadFalse(){
             setup();
             
             Test.startTest();
                 system.Test.setCurrentPage(new PageReference('/ConnectLead'));                
                 System.currentPageReference().getParameters().put('connectProjectId', '12343');
                 
                 ConnectLeadController ctrl=new ConnectLeadController();
                 Pagereference p = ctrl.findLead();
                 
                 system.assert(p==null);
                 
             Test.stoptest();  
        }
}